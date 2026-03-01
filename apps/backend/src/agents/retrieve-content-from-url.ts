import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

const DEFAULT_MAX_CHARACTERS = 6000;
const MAX_ALLOWED_CHARACTERS = 20000;
const MAX_URLS = 3;

interface ToolResponseBuffer {
  toolResults: Array<{ toolName: string; result: unknown }>;
  value?: string;
  models?: string[];
}

const retrieveContentInputSchema = z
  .object({
    urls: z
      .array(z.string().url().describe("HTTP or HTTPS URL to retrieve content from"))
      .min(1, "Provide at least one URL to retrieve content from")
      .max(MAX_URLS, `You can request up to ${MAX_URLS} URLs in a single call`)
      .describe("A list of URLs to fetch and clean content for"),
    maxCharacters: z
      .number()
      .int()
      .positive()
      .max(MAX_ALLOWED_CHARACTERS)
      .default(DEFAULT_MAX_CHARACTERS)
      .describe("Maximum number of characters to return per URL after cleaning (default: 6000, max: 20000)"),
    includeMetadata: z
      .boolean()
      .default(true)
      .describe("When true, include extracted metadata such as the page title and description"),
  })
  .describe("Parameters for retrieving cleaned article-like content from one or more URLs");

type RetrieveContentInput = z.infer<typeof retrieveContentInputSchema>;

interface RetrieveContentSuccess {
  url: string;
  status: "success";
  title?: string;
  description?: string;
  content: string;
  characters: number;
  truncated: boolean;
  fetchedAt: string;
}

interface RetrieveContentError {
  url: string;
  status: "error";
  error: string;
}

type RetrieveContentResult = RetrieveContentSuccess | RetrieveContentError;

let cachedExaClient: Exa | null = null;

function getExaClient(): Exa {
  if (cachedExaClient) {
    return cachedExaClient;
  }

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY is not set in the environment variables");
  }

  cachedExaClient = new Exa(apiKey);
  return cachedExaClient;
}

export function retrieveContentFromUrlAgent(response: ToolResponseBuffer) {
  if (!response.toolResults) {
    response.toolResults = [];
  }

  return (tool as any)({
    description:
      "Fetch and clean article-style content from one or more URLs. Use this when you need the full text behind a link that was referenced during the conversation.",
    inputSchema: retrieveContentInputSchema,
    execute: async ({ urls, maxCharacters, includeMetadata }: RetrieveContentInput) => {
      const uniqueUrls = Array.from(new Set(urls.map((url) => url.trim()))).slice(0, MAX_URLS);

      if (uniqueUrls.length === 0) {
        const fallback: RetrieveContentError = {
          url: "",
          status: "error",
          error: "No valid URLs provided",
        };

        const payload = {
          requestedUrls: urls,
          successCount: 0,
          errorCount: urls.length,
          summary: "No valid URLs provided",
          results: [fallback],
        };

        response.toolResults.push({
          toolName: "retrieveContentFromUrl",
          result: payload,
        });

        return payload;
      }

      let exaClientInstance: Exa;
      try {
        exaClientInstance = getExaClient();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[RetrieveContentAgent] Unable to initialize Exa client: ${message}`);
        const results: RetrieveContentResult[] = uniqueUrls.map((url) => ({
          url,
          status: "error",
          error: message || "Unable to initialize Exa client",
        }));

        const payload = {
          requestedUrls: uniqueUrls,
          successCount: 0,
          errorCount: uniqueUrls.length,
          summary: "Failed to initialize Exa client",
          results,
        };

        response.toolResults.push({
          toolName: "retrieveContentFromUrl",
          result: payload,
        });

        return payload;
      }

      const results = await Promise.all(
        uniqueUrls.map(async (url) => {
          return fetchContentWithExa(exaClientInstance, url, maxCharacters, includeMetadata);
        }),
      );

      const successCount = results.filter((result) => result.status === "success").length;
      const errorCount = results.length - successCount;

      const payload = {
        requestedUrls: uniqueUrls,
        successCount,
        errorCount,
        summary: successCount
          ? `Retrieved content for ${successCount} of ${uniqueUrls.length} URL${uniqueUrls.length > 1 ? "s" : ""}`
          : "Failed to retrieve content for the requested URLs",
        results,
      };

      response.toolResults.push({
        toolName: "retrieveContentFromUrl",
        result: payload,
      });

      return payload;
    },
  });
}

async function fetchContentWithExa(
  exaClient: Exa,
  url: string,
  maxCharacters: number,
  includeMetadata: boolean,
): Promise<RetrieveContentResult> {
  try {
    const exaResponse = await exaClient.getContents([url], {
      text: true,
      ...(includeMetadata ? { summary: true } : {}),
    });

    const exaResult = exaResponse?.results?.[0];

    if (!exaResult) {
      return {
        url,
        status: "error",
        error: "Exa did not return content for the provided URL",
      };
    }

    const text = sanitizeString((exaResult as any).text);

    if (!text) {
      return {
        url,
        status: "error",
        error: "Exa did not return textual content for the provided URL",
      };
    }

    const truncated = text.length > maxCharacters;
    const content = text.slice(0, maxCharacters);

    const title = includeMetadata ? sanitizeString((exaResult as any).title) : undefined;
    let description: string | undefined;

    if (includeMetadata) {
      description = sanitizeString((exaResult as any).summary) ?? summarizeHighlights((exaResult as any).highlights);
    }

    return {
      url,
      status: "success",
      title,
      description,
      content,
      characters: text.length,
      truncated,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      url,
      status: "error",
      error: normalizeErrorMessage(error),
    };
  }
}

function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : undefined;
}

function summarizeHighlights(highlights: unknown): string | undefined {
  if (!Array.isArray(highlights)) {
    return undefined;
  }

  const joined = highlights
    .map((highlight) => {
      if (typeof highlight === "string") {
        return highlight;
      }

      if (highlight && typeof (highlight as any).text === "string") {
        return (highlight as any).text;
      }

      if (highlight && typeof (highlight as any).snippet === "string") {
        return (highlight as any).snippet;
      }

      return "";
    })
    .filter((segment) => typeof segment === "string" && segment.trim().length > 0)
    .join(" ");

  return sanitizeString(joined);
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeErrorMessage(error: any): string {
  if (!error) {
    return "Unknown error while retrieving content";
  }

  const status = error.response?.status;
  const statusText = error.response?.statusText;
  if (status) {
    return `HTTP ${status}${statusText ? ` ${statusText}` : ""}`.trim();
  }

  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return "Request timed out while retrieving content";
  }

  if (typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }

  return "Failed to retrieve content";
}
