import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
}

export interface ExaSearchResult {
  query: string;
  results: SearchResultItem[];
  numberOfResults?: number;
}

export interface WebSearchAgentOptions {
  getCachedResult?: (query: string) => { result: ExaSearchResult; timestamp: number } | undefined;
  setCachedResult?: (query: string, result: ExaSearchResult) => void;
  recordQuery?: (query: string, wasCached: boolean) => void;
}

export const searchSchema = z.object({
  query: z.string().describe("The query to search for"),
  max_results: z.number().optional().default(10).describe("The maximum number of results to return (default: 10)"),
});

export function webSearchAgent(response: { value: string; toolResults: any[] }, options?: WebSearchAgentOptions) {
  return (tool as any)({
    description:
      "When users request information about current events, breaking news, or time-sensitive topics (using keywords like 'latest', 'recent', 'current', 'new', or mentioning specific dates), activate the web search function to retrieve up-to-date information. The search should prioritize credible news sources and recent content. For queries that don't explicitly require current information or can be answered with existing knowledge, skip the web search to maintain efficiency",
    inputSchema: searchSchema,
    execute: async ({ query, max_results = 10 }: { query: string; max_results?: number }) => {
      const cachedEntry = options?.getCachedResult?.(query);

      if (cachedEntry) {
        const cachedResult: ExaSearchResult & { cached: boolean; cachedAt: string } = {
          ...cachedEntry.result,
          cached: true,
          cachedAt: new Date(cachedEntry.timestamp).toISOString(),
        };

        console.log(`webSearch (cached): ${JSON.stringify({ query, cachedAt: cachedResult.cachedAt })}`);

        response.toolResults = [
          {
            toolName: "webSearch",
            result: cachedResult,
          },
        ];

        options?.recordQuery?.(query, true);
        return cachedResult;
      }

      const result = await exaSearch(query, max_results);
      console.log("webSearch results:", JSON.stringify({ query, numberOfResults: result.numberOfResults }, null, 2));

      const resultWithMetadata: ExaSearchResult & { cached: boolean } = {
        ...result,
        cached: false,
      };

      options?.setCachedResult?.(query, result);
      options?.recordQuery?.(query, false);

      response.toolResults = [
        {
          toolName: "webSearch",
          result: resultWithMetadata,
        },
      ];

      // TODO: Only return useful information
      return resultWithMetadata;
    },
  });
}

async function exaSearch(query: string, maxResult = 10): Promise<ExaSearchResult> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY is not set in the environment variables");
  }
  const exa = new Exa(apiKey);
  const exaResults = await exa.searchAndContents(query, {
    type: "neural",
    useAutoprompt: true,
    numResults: maxResult,
    text: true,
    // includeDomains,
    // excludeDomains,
    highlights: true,
    summary: true,
  });

  return {
    results: exaResults.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      content: result.summary, // result.text is a bit long
    })),
    query,
    numberOfResults: exaResults.results.length,
  };
}
