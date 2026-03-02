import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";

// Apify Twitter Scraper Response Types
interface ApifyTwitterAuthor {
  type: "user";
  userName: string;
  url: string;
  twitterUrl: string;
  id: string;
  name: string;
  isVerified: boolean;
  isBlueVerified: boolean;
  profilePicture: string;
  description: string;
  location: string;
  followers: number;
  following: number;
  status: string;
  canDm: boolean;
  canMediaTag: boolean;
  createdAt: string;
  entities: Record<string, any>;
  fastFollowersCount: number;
  favouritesCount: number;
  hasCustomTimelines: boolean;
  isTranslator: boolean;
  mediaCount: number;
  statusesCount: number;
  withheldInCountries: any[];
  affiliatesHighlightedLabel: Record<string, any>;
  possiblySensitive: boolean;
  pinnedTweetIds: string[];
}

interface ApifyTwitterEntities {
  hashtags: any[];
  symbols: any[];
  timestamps: any[];
  urls: Array<{
    url: string;
    expanded_url?: string;
    display_url?: string;
  }>;
  user_mentions: Array<{
    screen_name: string;
    name: string;
    id: string;
    id_str: string;
    indices: number[];
  }>;
}

interface ApifyTweetData {
  type: "tweet";
  id: string;
  url: string;
  twitterUrl: string;
  text: string;
  fullText: string;
  source: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  createdAt: string;
  lang: string;
  bookmarkCount: number;
  isReply: boolean;
  conversationId: string;
  possiblySensitive: boolean;
  isPinned: boolean;
  author: ApifyTwitterAuthor;
  extendedEntities: Record<string, any>;
  card: Record<string, any>;
  place: Record<string, any>;
  entities: ApifyTwitterEntities;
  isRetweet: boolean;
  retweet?: ApifyTweetData;
  isQuote: boolean;
  media: any[];
  isConversationControlled: boolean;
  noteTweet?: {
    text: string;
    entity_set?: Record<string, any>;
  };
}

export interface ApifyTwitterProfile {
  id: string;
  name: string;
  username: string;
  description: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  verified: boolean;
  profile_image_url: string;
  profile_banner_url?: string;
  location?: string;
  url?: string;
  created_at: string;
}

export interface ApifyTwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  conversation_id: string;
  lang: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  referenced_tweets?: Array<{
    type: string;
    id: string;
  }>;
  entities?: {
    urls?: Array<{
      url: string;
      expanded_url: string;
      display_url: string;
    }>;
    hashtags?: Array<{
      tag: string;
    }>;
    mentions?: Array<{
      username: string;
    }>;
  };
}

export interface ApifyTwitterResponse {
  profile: ApifyTwitterProfile;
  tweets: ApifyTwitterTweet[];
}

@Injectable()
export class ApifyTwitterService {
  private readonly logger = new Logger(ApifyTwitterService.name);
  private readonly apifyToken: string;
  private readonly MAX_TWEETS = 500;

  constructor(private readonly configService: ConfigService, @Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar) {
    this.apifyToken = this.configService.get<string>("APIFY_API_TOKEN");
    if (!this.apifyToken) {
      this.logger.warn("APIFY_API_TOKEN not configured - Apify Twitter scraper will not be available");
    }
  }

  async scrapeTwitterProfile(username: string): Promise<ApifyTwitterResponse> {
    if (!this.apifyToken) {
      throw new Error("APIFY_API_TOKEN is required for Twitter scraping");
    }

    try {
      this.logger.log(`Starting Apify Twitter scrape for username: ${username}`);

      // Use the Twitter Scraper Lite actor as shown in the OpenAPI spec
      const actorId = "apidojo~twitter-scraper-lite";

      this.logger.log(`Using actor ID: ${actorId}`);

      // Use run-sync-get-dataset-items endpoint for immediate results
      const response = await axios.post(
        `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${this.apifyToken}`,
        {
          twitterHandles: [username], // Twitter handles to scrape (as per OpenAPI spec)
          maxItems: this.MAX_TWEETS, // Maximum number of tweets
          sort: "Latest", // Get latest tweets
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 300000, // 5 minute timeout
        },
      );

      this.logger.log(`Apify sync run completed`);

      // Get results directly from response - this endpoint returns dataset items
      const results = Array.isArray(response.data) ? response.data : [];

      this.logger.log(`Received ${results.length} items from Apify`);

      if (results.length === 0) {
        throw new Error(`No data found for Twitter username: ${username}`);
      }

      // Parse the Apify response according to the actual data structure
      const tweets = results as ApifyTweetData[];

      // Get profile data from the first tweet's author
      const firstTweet = tweets[0];
      if (!firstTweet || !firstTweet.author) {
        throw new Error(`No valid tweet data found for username: ${username}`);
      }

      const authorData = firstTweet.author;

      // Transform to our expected format
      const profile: ApifyTwitterProfile = {
        id: authorData.id,
        name: authorData.name,
        username: authorData.userName,
        description: authorData.description || "",
        followers_count: authorData.followers,
        following_count: authorData.following,
        tweet_count: authorData.statusesCount,
        verified: authorData.isVerified || authorData.isBlueVerified,
        profile_image_url: authorData.profilePicture || "",
        profile_banner_url: undefined,
        location: authorData.location || undefined,
        url: authorData.url || undefined,
        created_at: authorData.createdAt,
      };

      const transformedTweets: ApifyTwitterTweet[] = tweets.map((tweet: ApifyTweetData) => {
        // Build referenced_tweets array
        const referencedTweets: Array<{ type: string; id: string }> = [];

        if (tweet.isRetweet && tweet.retweet) {
          referencedTweets.push({ type: "retweeted", id: tweet.retweet.id });
        }

        // For thread detection: if it's a reply but not a retweet, it could be part of a thread
        if (tweet.isReply && !tweet.isRetweet) {
          // We'll use conversation_id to group thread tweets later
          referencedTweets.push({ type: "replied_to", id: tweet.conversationId });
        }

        // Use the text field directly as it contains the complete tweet content
        // Note: Despite the naming, Apify's 'text' field contains full content while 'fullText' is truncated
        const tweetText = tweet.text || "";

        return {
          id: tweet.id,
          text: tweetText,
          created_at: tweet.createdAt,
          author_id: tweet.author.id,
          conversation_id: tweet.conversationId,
          lang: tweet.lang,
          public_metrics: {
            retweet_count: tweet.retweetCount,
            reply_count: tweet.replyCount,
            like_count: tweet.likeCount,
            quote_count: tweet.quoteCount,
          },
          referenced_tweets: referencedTweets.length > 0 ? referencedTweets : undefined,
          entities: tweet.entities
            ? {
                urls: tweet.entities.urls?.map((url) => ({
                  url: url.url,
                  expanded_url: url.expanded_url || url.url,
                  display_url: url.display_url || url.url,
                })),
                hashtags: tweet.entities.hashtags?.map((tag: any) => ({
                  tag: typeof tag === "string" ? tag : tag.text || tag.tag || "",
                })),
                mentions: tweet.entities.user_mentions?.map((mention) => ({
                  username: mention.screen_name,
                })),
              }
            : undefined,
        };
      });

      this.logger.log(`Parsed ${transformedTweets.length} tweets for user ${username}`);

      return {
        profile,
        tweets: transformedTweets.filter((tweet) => tweet.text && tweet.text.trim() !== ""),
      };
    } catch (error) {
      this.logger.error(`Apify Twitter scraping failed: ${error.message}`, error.response?.data || error.stack);

      // Log more details about the error
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        this.logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      }

      this.rollbar.error("Apify Twitter scraping failed", {
        username,
        error: error.message || String(error),
        stack: error.stack,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
      });

      throw new Error(`Failed to scrape Twitter profile via Apify: ${error.message}`);
    }
  }
}
