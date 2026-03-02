import { Injectable, Logger, Inject } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";

export interface ApifyLinkedInPost {
  urn: string;
  full_urn: string;
  posted_at: {
    date: string;
    relative: string;
    timestamp: number;
  };
  text: string;
  url: string;
  post_type: string;
  author: {
    first_name: string;
    last_name: string;
    headline: string;
    username: string;
    profile_url: string;
    profile_picture: string;
  };
  stats: {
    total_reactions: number;
    like: number;
    support: number;
    love: number;
    insight: number;
    celebrate: number;
    comments: number;
    reposts: number;
  };
  media?: any;
  article?: any;
  document?: any;
  reshared_post?: any;
}

export interface ApifyLinkedInResponse {
  posts: ApifyLinkedInPost[];
}

@Injectable()
export class ApifyLinkedInService {
  private readonly logger = new Logger(ApifyLinkedInService.name);
  private readonly apifyToken: string;
  private readonly baseUrl = "https://api.apify.com/v2";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar,
  ) {
    this.apifyToken = this.configService.get<string>("APIFY_API_TOKEN");
    if (!this.apifyToken) {
      this.logger.warn("APIFY_API_TOKEN not configured - Apify LinkedIn scraper will not be available");
    }
  }

  async scrapeLinkedInPosts(username: string, totalPosts = 200): Promise<ApifyLinkedInResponse> {
    if (!this.apifyToken) {
      throw new Error("APIFY_API_TOKEN is required for LinkedIn scraping");
    }

    try {
      this.logger.log(
        `Starting Apify LinkedIn scrape for username: ${username} (target ${Math.min(totalPosts, 500)} posts)`,
      );

      // Use the LinkedIn Profile Posts Scraper actor
      const actorId = "LQQIXN9Othf8f7R5n"; // Linkedin Profile Posts Scraper [NO COOKIES]

      this.logger.log(`Using actor ID: ${actorId}`);
      this.logger.log(`API endpoint: ${this.baseUrl}/acts/${actorId}/runs`);

      // Start the actor run
      const runResponse = await axios.post(
        `${this.baseUrl}/acts/${actorId}/runs`,
        {
          username: username,
          total_posts: totalPosts,
          limit: 100, // Results per page
        },
        {
          headers: {
            Authorization: `Bearer ${this.apifyToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const runId = runResponse.data.data.id;
      this.logger.log(`Apify run started with ID: ${runId}`);

      // Poll for completion and fetch up to desired number of items
      const maxWaitTime = totalPosts > 100 ? 180000 : 120000; // 3 minutes for large jobs, 2 minutes for smaller ones
      const rawResults = await this.waitForRunCompletion(runId, maxWaitTime, totalPosts);

      // Normalize results shape: handle array or wrapped object with posts
      let posts: ApifyLinkedInPost[] = Array.isArray(rawResults)
        ? rawResults
        : Array.isArray((rawResults as any)?.posts)
        ? (rawResults as any).posts
        : Array.isArray((rawResults as any)?.data?.posts)
        ? (rawResults as any).data.posts
        : [];

      posts = posts.filter((post) => post.post_type !== "repost");

      return {
        posts,
      };
    } catch (error) {
      this.logger.error(`Apify LinkedIn scraping failed: ${error.message}`, error.response?.data || error.stack);

      // Log more details about the error
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        this.logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      }

      this.rollbar.error("Apify LinkedIn scraping failed", {
        username,
        error: error.message || String(error),
        stack: error.stack,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
      });

      throw new Error(`Failed to scrape LinkedIn posts via Apify: ${error.message}`);
    }
  }

  private async waitForRunCompletion(runId: string, maxWaitTime = 300000, fetchLimit?: number): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check run status
        const statusResponse = await axios.get(`${this.baseUrl}/actor-runs/${runId}`, {
          headers: { Authorization: `Bearer ${this.apifyToken}` },
        });

        const status = statusResponse.data.data.status;

        if (status === "SUCCEEDED") {
          this.logger.log(`Apify run ${runId} completed successfully`);

          // Get results
          const itemsUrl = `${this.baseUrl}/actor-runs/${runId}/dataset/items${
            fetchLimit ? `?limit=${fetchLimit}` : ""
          }`;
          const resultsResponse = await axios.get(itemsUrl, {
            headers: { Authorization: `Bearer ${this.apifyToken}` },
          });

          // The actual response structure from Apify
          // resultsResponse.data might be the array directly or wrapped in a response object
          return resultsResponse.data;
        } else if (status === "FAILED") {
          throw new Error(`Apify run failed with status: ${status}`);
        } else if (status === "ABORTED") {
          throw new Error(`Apify run was aborted`);
        }

        // Still running, wait and check again
        this.logger.log(`Apify run ${runId} status: ${status}, waiting...`);
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error(`Apify run ${runId} not found`);
        }
        throw error;
      }
    }

    throw new Error(`Apify run ${runId} timed out after ${maxWaitTime}ms`);
  }
}
