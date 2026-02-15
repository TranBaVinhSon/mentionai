import { Injectable, Logger } from "@nestjs/common";
import { HttpClientWithRetry } from "../../common/utils";

interface YouTubeContent {
  url: string;
  videoId: string;
  transcript: string;
}

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);
  private readonly httpClient: HttpClientWithRetry;

  constructor() {
    this.httpClient = new HttpClientWithRetry(this.logger);
  }

  /**
   * Validate if the URL is a valid YouTube URL and extract video ID
   */
  validateAndExtractVideoId(url: string): string | null {
    try {
      const youtubeRegex =
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(youtubeRegex);
      return match ? match[1] : null;
    } catch (error) {
      this.logger.error(`Error validating YouTube URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Get transcript for a YouTube video using Supadata AI API
   */
  private async getTranscript(videoId: string): Promise<string> {
    try {
      this.logger.log(`Fetching transcript for YouTube video: ${videoId}`);

      // Use Supadata AI API for reliable transcript fetching
      const transcriptText = await this.getTranscriptFromSupadataAPI(videoId);

      if (transcriptText && transcriptText.trim().length > 0) {
        this.logger.log(`Successfully fetched transcript for ${videoId}: ${transcriptText.length} characters`);
        return transcriptText.trim();
      }

      this.logger.warn(`No transcript found for video ${videoId} via Supadata API`);
      return ""; // Return empty string to allow video processing to continue
    } catch (error) {
      this.logger.error(`All transcript methods failed for ${videoId}:`, error);
      return ""; // Return empty string instead of throwing to allow video processing to continue
    }
  }

  /**
   * Fetch transcript from Supadata AI API
   */
  private async getTranscriptFromSupadataAPI(videoId: string): Promise<string> {
    try {
      const apiKey = process.env.SUPADATA_API_KEY;
      if (!apiKey) {
        this.logger.warn("Supadata API key not configured, trying fallback method");
        throw new Error("Supadata API key not configured");
      }

      // Construct YouTube URL from video ID
      const youtubeUrl = `https://youtu.be/${videoId}`;

      const response = await this.httpClient.get(
        `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(youtubeUrl)}`,
        {
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          retries: 2,
        },
      );

      if (response.data) {
        if (response.data.content && Array.isArray(response.data.content)) {
          const transcript = response.data.content
            .map((segment: any) => segment.text || "")
            .filter((text: string) => text.trim().length > 0)
            .join(" ");

          if (transcript.trim().length > 0) {
            this.logger.log(
              `Successfully extracted transcript from Supadata API for ${videoId}: ${
                transcript.length
              } characters, language: ${response.data.lang || "unknown"}`,
            );
            return transcript;
          }
        }

        if (typeof response.data === "string") {
          return response.data;
        }

        if (response.data.transcript) {
          return response.data.transcript;
        }

        if (response.data.text) {
          return response.data.text;
        }

        if (response.data.data && response.data.data.transcript) {
          return response.data.data.transcript;
        }

        // If response has segments/entries, combine them
        if (Array.isArray(response.data.segments)) {
          return response.data.segments
            .map((segment: any) => segment.text || segment.content || "")
            .filter((text: string) => text.trim().length > 0)
            .join(" ");
        }

        if (Array.isArray(response.data)) {
          return response.data
            .map((item: any) => item.text || item.content || "")
            .filter((text: string) => text.trim().length > 0)
            .join(" ");
        }

        this.logger.warn(`Unexpected response format from Supadata API for ${videoId}:`, response.data);
        return "";
      }

      this.logger.warn(`Empty response from Supadata API for video ${videoId}`);
      return "";
    } catch (error) {
      console.log(error);
      this.logger.error(`Error fetching transcript from Supadata API for ${videoId}:`, error.message);
      throw error;
    }
  }

  /**
   * Main method to extract content from YouTube URL
   */
  async extractContent(url: string): Promise<YouTubeContent | null> {
    try {
      const videoId = this.validateAndExtractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL or unable to extract video ID");
      }

      this.logger.log(`Extracting content for YouTube video: ${videoId}`);

      // Get transcript only
      const transcript = await this.getTranscript(videoId);

      const content: YouTubeContent = {
        url,
        videoId,
        transcript: transcript || "No transcript available",
      };

      this.logger.log(`Successfully extracted content for video: ${videoId} (${transcript.length} chars transcript)`);
      return content;
    } catch (error) {
      this.logger.error(`Error extracting YouTube content for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Validate multiple YouTube URLs
   */
  validateUrls(urls: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    urls.forEach((url) => {
      if (this.validateAndExtractVideoId(url)) {
        valid.push(url);
      } else {
        invalid.push(url);
      }
    });

    return { valid, invalid };
  }

  /**
   * Extract content from multiple YouTube URLs
   */
  async extractMultipleContents(urls: string[]): Promise<(YouTubeContent | null)[]> {
    const promises = urls.map((url) =>
      this.extractContent(url).catch((error) => {
        this.logger.error(`Failed to extract content from ${url}:`, error);
        return null;
      }),
    );

    return Promise.all(promises);
  }
}
