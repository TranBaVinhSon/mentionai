import { Injectable, Logger, Inject } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import { ApifyTwitterService, ApifyTwitterTweet } from "../../twitter/apify-twitter.service";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";
import { BaseSnsService } from "./base-sns.service";

// Define content interface that matches what apps service expects
interface SocialContentData {
  userId: number;
  appId: number;
  source: SocialNetworkType;
  type: "post" | "comment" | "profile";
  externalId: string;
  content: string; // This is the text content
  media: any[];
  parentId: string | null;
  postedAt: Date;
  username: string;
  metadata: any;
}

@Injectable()
export class TwitterService extends BaseSnsService {
  private readonly logger = new Logger(TwitterService.name);

  private readonly validationCache = new Map<
    string,
    {
      profile: any;
      tweets: any[];
      timestamp: number;
    }
  >();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
    private readonly apifyTwitterService: ApifyTwitterService,
    @Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
  }

  async fetchUserContent(userId: number, username: string, appId: number): Promise<SocialContentData[]> {
    try {
      this.logger.log(`Fetching complete Twitter profile data for username: ${username}`);

      // Check cache first
      let profile: any;
      let tweets: any[];
      const cachedData = this.validationCache.get(username);

      if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_TTL) {
        this.logger.log(`Using cached validation data for ${username}`);
        profile = cachedData.profile;
        tweets = cachedData.tweets;
      } else {
        // Fetch all data directly from Apify
        this.logger.log(`Fetching Twitter data for ${username} from Apify`);
        const result = await this.apifyTwitterService.scrapeTwitterProfile(username);
        profile = result.profile;
        tweets = result.tweets;

        // Cache the result
        if (profile) {
          this.validationCache.set(username, { profile, tweets, timestamp: Date.now() });
          this.logger.log(`Cached Twitter data for ${username} to avoid duplicate Apify calls`);
        }
      }

      if (!profile) {
        throw new Error(`No Twitter profile found for username: ${username}`);
      }

      this.logger.log(`Fetched ${tweets.length} Twitter tweets for ${username}`);
      const contentEntities: SocialContentData[] = [];
      const profileLink = `https://x.com/${username}`;

      this.logger.log(`Starting to process Twitter data for ${username}`);

      // 1. Store profile data
      this.logger.log(`Processing profile data for ${username}`);
      const profileContent: SocialContentData = {
        userId,
        appId,
        source: SocialNetworkType.TWITTER,
        type: "profile",
        externalId: profileLink,
        content: `# ${profile.name}\n**Username:** @${profile.username}\n**Bio:** ${
          profile.description || "No bio"
        }\n**Followers:** ${profile.followers_count}\n**Following:** ${
          profile.following_count
        }\n**Profile URL:** ${profileLink}`,
        media: [],
        parentId: null,
        postedAt: new Date(),
        username: username,
        metadata: {
          type: "profile",
          fullName: profile.name,
          username: profile.username,
          description: profile.description,
          followersCount: profile.followers_count,
          followingCount: profile.following_count,
          tweetCount: profile.tweet_count,
          verified: profile.verified,
          profileImageUrl: profile.profile_image_url,
          profileBannerUrl: profile.profile_banner_url,
          location: profile.location,
          url: profile.url,
          profileUrl: profileLink,
          fetchedAt: new Date().toISOString(),
          isProfileData: true,
        },
      };

      contentEntities.push(profileContent);
      this.logger.log(`Profile data processed and added to contentEntities`);

      // 2. Store all tweets that have text content
      this.logger.log(`Starting to process ${tweets.length} tweets for ${username}`);
      let processedTweets = 0;

      // Group tweets by conversation_id to identify threads
      const conversationMap = new Map<string, ApifyTwitterTweet[]>();

      for (const tweet of tweets) {
        // Skip tweets without text content
        if (!tweet.text || tweet.text.trim() === "") {
          continue;
        }

        // Skip retweets (they have referenced_tweets with type "retweeted")
        if (tweet.referenced_tweets?.some((ref) => ref.type === "retweeted")) {
          continue;
        }

        const conversationId = tweet.conversation_id;
        if (!conversationMap.has(conversationId)) {
          conversationMap.set(conversationId, []);
        }
        conversationMap.get(conversationId).push(tweet);
      }

      this.logger.log(`Found ${conversationMap.size} conversations from ${tweets.length} tweets`);

      // Process each conversation (which may be a single tweet or a thread)
      for (const [conversationId, conversationTweets] of conversationMap.entries()) {
        // Sort tweets by creation time to maintain thread order
        conversationTweets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Check if this is a thread by the same author
        const firstTweet = conversationTweets[0];
        const isThread =
          conversationTweets.length > 1 && conversationTweets.every((t) => t.author_id === firstTweet.author_id);

        if (isThread) {
          // Combine all tweets in the thread into one content entry
          const combinedText = conversationTweets.map((t) => t.text).join("\n\n");
          const firstTweetMetrics = firstTweet.public_metrics;

          this.logger.log(
            `Processing thread with ${conversationTweets.length} tweets, conversation_id: ${conversationId}`,
          );

          const threadContent: SocialContentData = {
            userId,
            appId,
            source: SocialNetworkType.TWITTER,
            type: "post",
            externalId: `https://x.com/${username}/status/${firstTweet.id}`,
            content: combinedText,
            media: [],
            parentId: null,
            postedAt: new Date(firstTweet.created_at),
            username: username,
            metadata: {
              tweet_id: firstTweet.id,
              conversation_id: conversationId,
              is_thread: true,
              thread_length: conversationTweets.length,
              thread_tweet_ids: conversationTweets.map((t) => t.id),
              lang: firstTweet.lang,
              public_metrics: {
                retweet_count: firstTweetMetrics.retweet_count || 0,
                reply_count: firstTweetMetrics.reply_count || 0,
                like_count: firstTweetMetrics.like_count || 0,
                quote_count: firstTweetMetrics.quote_count || 0,
              },
              entities: firstTweet.entities,
              referenced_tweets: firstTweet.referenced_tweets,
            },
          };

          contentEntities.push(threadContent);
          processedTweets++;
        } else {
          // Single tweet (not part of a thread)
          const tweet = firstTweet;

          const tweetContent: SocialContentData = {
            userId,
            appId,
            source: SocialNetworkType.TWITTER,
            type: "post",
            externalId: `https://x.com/${username}/status/${tweet.id}`,
            content: tweet.text,
            media: [],
            parentId: null,
            postedAt: new Date(tweet.created_at),
            username: username,
            metadata: {
              tweet_id: tweet.id,
              conversation_id: conversationId,
              lang: tweet.lang,
              public_metrics: {
                retweet_count: tweet.public_metrics.retweet_count || 0,
                reply_count: tweet.public_metrics.reply_count || 0,
                like_count: tweet.public_metrics.like_count || 0,
                quote_count: tweet.public_metrics.quote_count || 0,
              },
              entities: tweet.entities,
              referenced_tweets: tweet.referenced_tweets,
            },
          };

          contentEntities.push(tweetContent);
          processedTweets++;
        }
      }

      this.logger.log(
        `Finished processing tweets. Processed: ${processedTweets}, Total content entities: ${contentEntities.length}`,
      );

      this.logger.log(
        `Successfully fetched and saved ${contentEntities.length} Twitter items (1 profile + ${processedTweets} tweets) for user ${userId}`,
      );

      return contentEntities;
    } catch (error) {
      this.logger.error(`Error fetching Twitter content: ${error.message}`, error.stack);
      this.logger.error(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      this.rollbar.error("Error fetching Twitter content", {
        userId,
        username,
        appId,
        error: error.message || String(error),
        stack: error.stack,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw error;
    }
  }

  // Simple username validation by attempting to fetch profile
  async validateUsername(username: string): Promise<{
    valid: boolean;
    profileSummary?: {
      name: string;
      username: string;
      bio: string;
      avatar?: string;
      followersCount: number;
      tweetsCount: number;
    };
    error?: string;
  }> {
    try {
      this.logger.log(`Validating Twitter username: ${username}`);

      // Check cache first to avoid re-fetching
      const cachedData = this.validationCache.get(username);
      if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_TTL) {
        this.logger.log(`Using cached Twitter data for validation of ${username}`);
        const profile = cachedData.profile;
        const tweets = cachedData.tweets;

        return {
          valid: true,
          profileSummary: {
            name: profile.name,
            username: profile.username,
            bio: profile.description || "",
            avatar: profile.profile_image_url || undefined,
            followersCount: profile.followers_count,
            tweetsCount: tweets.length,
          },
        };
      }

      const result = await this.apifyTwitterService.scrapeTwitterProfile(username);
      const profile = result.profile;
      const tweets = result.tweets;

      if (!profile) {
        throw new Error(`No Twitter profile found for username: ${username}`);
      }

      // Cache the result
      this.validationCache.set(username, { profile, tweets, timestamp: Date.now() });
      this.logger.log(`Cached Twitter data for ${username} during validation`);

      return {
        valid: true,
        profileSummary: {
          name: profile.name,
          username: profile.username,
          bio: profile.description || "",
          avatar: profile.profile_image_url || undefined,
          followersCount: profile.followers_count,
          tweetsCount: tweets.length,
        },
      };
    } catch (error) {
      this.logger.warn(`Twitter username validation failed for ${username}: ${error.message}`);
      this.rollbar.error("Twitter username validation failed", {
        username,
        error: error.message || String(error),
        stack: error.stack,
      });
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing Twitter content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(credential.userId, credential.username, appId);

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for Twitter app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.TWITTER,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new Twitter content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.TWITTER;
        socialContent.content = content.content;
        socialContent.type =
          content.type === "post"
            ? SocialContentType.POST
            : content.type === "comment"
            ? SocialContentType.COMMENT
            : SocialContentType.PROFILE;
        socialContent.externalId = content.externalId;
        socialContent.appId = appId;
        socialContent.socialCredentialId = credential.id;
        socialContent.socialContentCreatedAt = content.postedAt;
        socialContent.metadata = content.metadata;
        return socialContent;
      });

      await this.socialContentRepository.save(contentEntities);
      this.logger.log(`Synced ${contentEntities.length} new Twitter items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing Twitter content for app ${appId}:`, error);
      throw error;
    }
  }
}
