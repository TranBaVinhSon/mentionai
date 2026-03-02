import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { AVAILABLE_MODELS } from "../../config/constants";
import axios from "axios";
import { createHash } from "crypto";

function getHomeUrl(): string {
  return process.env.NODE_ENV === "production" ? "https://mentionai.io" : null;
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if error is worth retrying for memory operations
 * Includes comprehensive error detection for network errors, timeouts, and server errors
 */
export function isRetryableError(error: any): boolean {
  // Network errors, timeouts, and connection issues
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
    return true;
  }

  // Check for undici timeout errors (UND_ERR_CONNECT_TIMEOUT)
  if (error.code === "UND_ERR_CONNECT_TIMEOUT") {
    return true;
  }

  // Check for undici timeout errors in nested cause
  if (error.cause && error.cause.code === "UND_ERR_CONNECT_TIMEOUT") {
    return true;
  }

  // Generic fetch failures
  if (error.message && error.message.includes("fetch failed")) {
    return true;
  }

  // Server errors (5xx)
  if (error.status >= 500 && error.status <= 599) {
    return true;
  }

  // Check for gateway errors in error messages (for APIs that return HTML error pages)
  if (error.message) {
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes("502 bad gateway") ||
      errorMessage.includes("503 service unavailable") ||
      errorMessage.includes("504 gateway time-out") ||
      errorMessage.includes("504 gateway timeout")
    ) {
      return true;
    }
  }

  // Rate limiting (429)
  if (error.status === 429 || error.response?.status === 429) {
    return true;
  }

  return false;
}

/**
 * Retry a function with exponential backoff
 * @param fn - The function to retry
 * @param options - Retry options
 * @param options.retries - Number of retries (default: 3)
 * @param options.onRetry - Callback called on each retry
 * @param options.shouldRetry - Function to determine if error should trigger retry (default: uses comprehensive error checking)
 * @param options.baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Promise that resolves with the function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    onRetry?: (attempt: number, error: any, delay: number) => void;
    shouldRetry?: (error: any) => boolean;
    baseDelay?: number;
  } = {},
): Promise<T> {
  const { retries = 3, onRetry, shouldRetry = isRetryableError, baseDelay = 1000 } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!shouldRetry(error) || attempt === retries - 1) {
        throw error;
      }

      const delay = Math.pow(2, attempt) * baseDelay + Math.random() * baseDelay; // Exponential backoff with jitter

      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      await sleep(delay);
    }
  }

  throw new Error("Should not reach here");
}

const X_TITLE = "MentionAI - AI at Your Command";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": getHomeUrl(),
    "X-Title": X_TITLE,
  },
});

export function modelStringToLanguageModel(model: string): any {
  if (model === "gpt-4o") {
    return openai("gpt-4o");
  } else if (model === "gpt-4o-mini") {
    return openai("gpt-4o-mini");
  } else if (model === "gpt-4.1") {
    return openai("gpt-4.1");
  } else if (model === "gpt-4.1-nano") {
    return openai("gpt-4.1-nano");
  } else if (model === "gpt-4.1-mini") {
    return openai("gpt-4.1-mini");
  } else if (model === "gpt-5-nano") {
    return openai("gpt-5-nano");
  } else if (model === "gpt-5-mini") {
    return openai("gpt-5-mini");
  } else if (model === "gpt-5") {
    return openai("gpt-5");
  } else if (model === "o3-mini") {
    return openai("o3-mini");
  } else if (model === "o1-preview") {
    return openrouter("openai/o1-preview");
  } else if (model === "o1-mini") {
    return openrouter("openai/o1-mini");
  } else if (model === "claude-3-haiku") {
    return anthropic("claude-3-haiku-20240307");
  } else if (model === "claude-4-sonnet") {
    return anthropic("claude-sonnet-4-20250514");
  } else if (model === "claude-4-opus") {
    return anthropic("claude-opus-4-20250514");
  } else if (model === "claude-4.5-sonnet") {
    return anthropic("claude-sonnet-4-5-20250929");
  } else if (model === "claude-3-5-haiku") {
    return anthropic("claude-3-5-haiku-20241022");
  } else if (model === "claude-3-7-sonnet-20250219") {
    return anthropic("claude-3-7-sonnet-20250219");
  } else if (model === "perplexity") {
    const perplexity = createOpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY ?? "",
      baseURL: "https://api.perplexity.ai/",
    });

    return perplexity("llama-3.1-sonar-large-128k-online");
  } else if (model === "llama-3.1-405b-reasoning") {
    const groq = createOpenAI({
      apiKey: process.env.GROQ_API_KEY ?? "",
      baseURL: "https://api.groq.com/openai/v1",
    });

    return groq("llama-3.1-405b-reasoning");
  } else if (model === "llama-3.1-70b-versatile") {
    return openrouter("meta-llama/llama-3.1-70b-instruct");
  } else if (model === "o3-mini-high") {
    return openai("o3-mini-high");
  } else if (model === "o3") {
    // o3 is a reasoning model that requires special configuration
    return openai("o3");
  } else if (model === "gpt-4.5") {
    return openai("gpt-4.5-preview");
  } else if (model === "claude-3-7-sonnet") {
    return anthropic("claude-3-7-sonnet-20250219");
  }
  // else if (model === "nvidia-llama-nemotron") {
  // try {
  //     return openrouter(
  //       "nvidia/llama-3.3-nemotron-super-49b-v1:free"
  //     ) as LanguageModel;
  //   } catch (error) {
  //     console.error("Error creating NVIDIA Llama Nemotron model:", error);
  //     return null;
  //   }
  // }
  else if (model === "gemini-2.5-pro") {
    return openrouter("google/gemini-pro-1.5");
  } else if (model === "gemini-2.0-flash") {
    return openrouter("google/gemini-2.0-flash-exp:free");
  } else if (model === "llama-3.1-8b-instant") {
    const groq = createOpenAI({
      apiKey: process.env.GROQ_API_KEY ?? "",
      baseURL: "https://api.groq.com/openai/v1",
    });

    return groq("llama-3.1-8b-instant");
  } else if (model === "llama-3.3-70b-instruct") {
    return openrouter("meta-llama/llama-3.3-70b-instruct");
  } else if (model === "llama-3.2-90b-vision-instruct") {
    return openrouter("meta-llama/llama-3.2-90b-vision-instruct");
  } else if (model === "gemini-1.5-flash") {
    return openrouter("google/gemini-flash-1.5");
  } else if (model === "gemini-1.5-pro") {
    return openrouter("google/gemini-pro-1.5");
  } else if (model === "nvidia/nemotron-70b-instruct") {
    try {
      return openrouter("nvidia/llama-3.1-nemotron-70b-instruct");
    } catch (error) {
      console.error("Error creating Nemotron 70b model:", error);
      // Fallback to a different model or return null
      return null;
    }
  } else if (model === "grok-beta") {
    return openrouter("x-ai/grok-beta");
  } else if (model === "grok-2") {
    return openrouter("x-ai/grok-2-1212");
  } else if (model === "grok-4") {
    return openrouter("x-ai/grok-4");
  } else if (model === "deepseek-v3") {
    return openrouter("deepseek/deepseek-chat");
  } else if (model === "deepseek-r1") {
    // return deepseek("deepseek-reasoner");
    return openrouter("deepseek/deepseek-r1");
  }

  return null;
  // return openai("gpt-4o-mini");
}

// generate image about React.js using @stable-diffusion-3 and using @gpt-4o to write a blog about its latest features
export function extractModelsFromRequest(request: string): string[] {
  const modelRegex = /@(gemini-\d+(?:\.\d+)?(?:-\w+)?|[\w.-]+)/g;
  const matches = request.matchAll(modelRegex);
  const models = Array.from(matches, (match) => match[1]);
  return models;
}

export function isProModel(model: string): boolean {
  return AVAILABLE_MODELS.find((m) => m.name === model)?.isProModel || false;
}

export function isContainsProModels(models: string[]): boolean {
  return models.some((model) => isProModel(model));
}

export function getAppLogo(name: string): string {
  return `https://mentionai-static-assets.s3.ap-northeast-1.amazonaws.com/apps/${name}.webp`;
}

/**
 * HTTP client with automatic retry logic and caching for social media APIs
 *
 * Usage example:
 * ```typescript
 * const httpClient = new HttpClientWithRetry(logger);
 * const response = await httpClient.get('https://api.example.com/data', {
 *   headers: { 'Authorization': 'Bearer token' },
 *   retries: 3,
 *   useCache: true
 * });
 * ```
 */
export class HttpClientWithRetry {
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  constructor(
    private readonly logger?: {
      log: (message: string) => void;
      warn: (message: string) => void;
    },
  ) {}

  private getCachedResponse(url: string): any | null {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger?.log(`Using cached response for ${url}`);
      return cached.data;
    }
    return null;
  }

  private setCachedResponse(url: string, data: any): void {
    this.cache.set(url, { data, timestamp: Date.now() });

    // Clean up old cache entries
    if (this.cache.size > 100) {
      const now = Date.now();
      const entries = Array.from(this.cache.entries());
      for (const [key, value] of entries) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }
    }
  }

  async get(
    url: string,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
      useCache?: boolean;
    } = {},
  ): Promise<any> {
    const { headers = {}, timeout = 15000, retries = 3, useCache = true } = options;

    // Check cache first if enabled
    if (useCache) {
      const cachedResponse = this.getCachedResponse(url);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    return retryWithBackoff(
      async () => {
        const response = await axios.get(url, {
          timeout,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "application/json, application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            ...headers,
          },
        });

        // Cache successful response if caching is enabled
        if (useCache) {
          this.setCachedResponse(url, response);
        }
        return response;
      },
      {
        retries,
        onRetry: (attempt, error, delay) => {
          this.logger?.warn(
            `Rate limited on attempt ${attempt}/${retries}, waiting ${Math.round(delay)}ms before retry for ${url}`,
          );
        },
        shouldRetry: (error) => error.response?.status === 429,
        baseDelay: 1000,
      },
    );
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export function generateSocialContentDocId(id: number | string): string {
  return createHash("md5").update(`social_content:${id}`).digest("hex");
}

export function generateAppLinkDocId(id: number | string): string {
  return createHash("md5").update(`app_link:${id}`).digest("hex");
}
