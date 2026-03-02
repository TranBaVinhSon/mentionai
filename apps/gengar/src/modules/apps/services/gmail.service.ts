import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { BaseSnsService } from "./base-sns.service";

// Define interfaces for Gmail API responses
interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body?: {
        data?: string;
      };
    }>;
  };
  internalDate: string;
}

// Define simplified content interface for memory storage
interface EmailContentData {
  userId: number;
  appId: number;
  source: SocialNetworkType;
  type: "email";
  externalId: string;
  content: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  threadId: string;
  sentAt: Date;
  metadata: any;
}

@Injectable()
export class GmailService extends BaseSnsService {
  private readonly logger = new Logger(GmailService.name);
  private oauth2Client: OAuth2Client;

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || "http://localhost:4000/apps/connect",
    );
  }

  generateAuthUrl(): string {
    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
    });
  }

  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    username: string;
    profileId: string;
  }> {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      throw new Error("Missing required Gmail OAuth credentials");
    }

    if (!code || code.trim().length === 0) {
      throw new Error("Authorization code is empty or invalid");
    }

    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token received from Google OAuth");
    }

    this.oauth2Client.setCredentials(tokens);

    try {
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: "v2",
      });

      const userInfo = await oauth2.userinfo.get();
      const profile = userInfo.data;

      if (!profile.email || !profile.id) {
        throw new Error("Incomplete user profile received from Google");
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        username: profile.email,
        profileId: profile.id,
      };
    } catch (error) {
      // Fallback to placeholder values if user info fetch fails
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        username: "gmail_user",
        profileId: "gmail_user_id",
      };
    }
  }

  async fetchUserContent(userId: number, accessToken: string, username: string, appId: number, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });

    // Get the most recent 500 received emails (inbox, not sent)
    const query = "in:inbox -in:sent";

    const messagesResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 500,
    });

    const messages = messagesResponse.data.messages || [];

    const emailEntities = await Promise.all(
      messages.map(async (message) => {
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
          });

          const emailData = this.parseGmailMessage(fullMessage.data as GmailMessage, userId, appId, username);

          // Memory ingestion will be handled after DB storage in apps service

          return emailData;
        } catch (error) {
          this.logger.error(`Error processing email ${message.id}: ${error.message}`);
          return null;
        }
      }),
    );

    return emailEntities.filter((email) => email !== null);
  }

  /**
   * Parse Gmail message into our EmailContentData format
   */
  private parseGmailMessage(message: GmailMessage, userId: number, appId: number, username: string): EmailContentData {
    const headers = message.payload.headers;
    const getHeader = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

    // Extract email body
    let body = "";
    if (message.payload.body?.data) {
      body = this.decodeBase64(message.payload.body.data);
    } else if (message.payload.parts) {
      // Find text/plain or text/html part
      const textPart = message.payload.parts.find((part) => part.mimeType === "text/plain");
      const htmlPart = message.payload.parts.find((part) => part.mimeType === "text/html");

      const selectedPart = textPart || htmlPart;
      if (selectedPart?.body?.data) {
        body = this.decodeBase64(selectedPart.body.data);

        // If it's HTML, try to extract text content
        if (selectedPart.mimeType === "text/html") {
          body = this.stripHtml(body);
        }
      }
    }

    return {
      userId,
      appId,
      source: SocialNetworkType.GMAIL,
      type: "email",
      externalId: message.id,
      content: body.trim() || message.snippet || "",
      subject: getHeader("Subject"),
      from: getHeader("From"),
      to: getHeader("To"),
      cc: getHeader("Cc"),
      bcc: getHeader("Bcc"),
      threadId: message.threadId,
      sentAt: new Date(parseInt(message.internalDate)),
      metadata: {
        messageId: message.id,
        threadId: message.threadId,
        labels: message.labelIds || [],
        snippet: message.snippet,
      },
    };
  }

  /**
   * Decode base64 encoded string
   */
  private decodeBase64(data: string): string {
    // Gmail API uses URL-safe base64 encoding
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    // Basic HTML stripping - in production, consider using a proper HTML parser
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Extract email address from a "Name <email@example.com>" format
   */
  private extractEmailAddress(emailString: string): string {
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString;
  }

  /**
   * Refresh access token if expired
   */
  private async refreshAccessToken(credentials: SocialCredential) {
    if (!credentials.refreshToken) {
      throw new Error("No refresh token available");
    }

    this.oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
    credentials.accessToken = newCredentials.access_token!;
    await this.socialCredentialsRepository.save(credentials);
    return credentials;
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing Gmail content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(
        credential.userId,
        credential.accessToken,
        credential.username,
        appId,
        credential.refreshToken,
      );

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for Gmail app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.GMAIL,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new Gmail content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.GMAIL;
        socialContent.content = content.content;
        socialContent.type = SocialContentType.EMAIL;
        socialContent.externalId = content.externalId;
        socialContent.appId = appId;
        socialContent.socialCredentialId = credential.id;
        socialContent.socialContentCreatedAt = content.sentAt;
        socialContent.metadata = {
          ...content.metadata,
          subject: content.subject,
          from: content.from,
          to: content.to,
          cc: content.cc,
          bcc: content.bcc,
          threadId: content.threadId,
        };
        return socialContent;
      });

      await this.socialContentRepository.save(contentEntities);
      this.logger.log(`Synced ${contentEntities.length} new Gmail emails for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing Gmail content for app ${appId}:`, error);
      throw error;
    }
  }
}
