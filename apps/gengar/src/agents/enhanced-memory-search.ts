import { tool } from "ai";
import { z } from "zod";
import { RetrievalOrchestratorService } from "src/modules/retrieval/retrieval-orchestrator.service";
import { User } from "src/db/entities/user.entity";
import { App } from "src/db/entities/app.entity";
import { RetrievalRequest } from "src/modules/retrieval/types/retrieval.types";

interface EnhancedMemorySearchResult {
  query: string;
  totalResults: number;
  memories: number;
  contents: number;
  topResults: Array<{
    content: string;
    relevanceScore: number;
    source: string;
    type?: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  }>;
  processingTime: number;
  // Add structured references for frontend visualization
  references: Array<{
    id: string;
    content: string;
    source: string;
    type?: string;
    timestamp: string;
    relevanceScore: number;
    metadata: {
      app_id?: string;
      source: string;
      type?: string;
      link?: string;
      timestamp: string;
      ingested_at?: string;
      externalId?: string;
      conversationId?: number;
      role?: string;
    };
  }>;
}

export const enhancedMemorySearchSchema = z.object({
  query: z
    .string()
    .describe(
      "What to search for in the user's content (e.g., 'my interests', 'my personality', 'my social posts', 'what I wrote about AI')",
    ),
  max_results: z.number().optional().default(15).describe("Maximum number of results to return (default: 15)"),
  search_types: z
    .array(z.enum(["memory", "fulltext", "semantic"]))
    .optional()
    .default(["memory", "fulltext", "semantic"])
    .describe("Search types: memory=Mem0 memories, fulltext=text search in content, semantic=vector similarity search"),
});

export function enhancedMemorySearchAgent(
  response: {
    value: string;
    toolResults: any[];
  },
  retrievalOrchestrator: RetrievalOrchestratorService,
  user: User,
  app?: App,
  conversationId?: number,
) {
  return (tool as any)({
    description:
      "COMPREHENSIVE SOCIAL CONTENT ANALYSIS: Search through ALL the user's social media posts, comments, emails, and digital content to analyze their personality, interests, and behavior patterns. Use this when the user asks: 'tell me about myself', 'search my social content', 'analyze my posts', 'what are my interests', 'what do I post about', 'describe my personality', 'what can you learn about me', 'search my content', or any request for self-analysis or content exploration. This is the PRIMARY tool for understanding who the user is based on their digital footprint.",
    inputSchema: enhancedMemorySearchSchema,
    execute: async (params: any) => {
      const { query } = params;
      let max_results = params.max_results || 15;
      let search_types = params.search_types;
      console.log(`[SearchMyContent] Starting comprehensive search for: "${query}"`);

      // Auto-optimize search based on query intent
      const normalizedQuery = query.toLowerCase();

      // For personality/self-analysis queries, use all search types
      if (
        normalizedQuery.includes("myself") ||
        normalizedQuery.includes("personality") ||
        normalizedQuery.includes("about me") ||
        normalizedQuery.includes("who am i")
      ) {
        search_types = search_types || ["memory", "fulltext", "semantic"];
        max_results = Math.max(max_results, 20);
      }

      // For content analysis queries, prioritize fulltext and semantic
      if (
        normalizedQuery.includes("posts") ||
        normalizedQuery.includes("content") ||
        normalizedQuery.includes("social") ||
        normalizedQuery.includes("wrote")
      ) {
        search_types = search_types || ["fulltext", "semantic", "memory"];
        max_results = Math.max(max_results, 15);
      }

      // Build retrieval request
      const retrievalRequest: RetrievalRequest = {
        query,
        userId: user.id,
        appId: app?.id,
        maxResults: max_results,
      };

      try {
        const retrievalResponse = await retrievalOrchestrator.retrieve(retrievalRequest);

        // Format the response for the AI agent
        const allResults = [
          ...retrievalResponse.memories.map((m) => ({
            content: m.memory,
            relevanceScore: m.relevanceScore,
            source: m.source,
            type: "memory",
            timestamp: m.createdAt,
            metadata: m.metadata,
          })),
          ...retrievalResponse.contents.map((c) => ({
            content: c.content,
            relevanceScore: c.relevanceScore,
            source: c.source,
            type: c.type,
            timestamp: c.createdAt?.toISOString(),
            metadata: c.metadata,
          })),
        ];

        const result: EnhancedMemorySearchResult = {
          query,
          totalResults: retrievalResponse.totalResults,
          memories: retrievalResponse.memories.length,
          contents: retrievalResponse.contents.length,
          topResults: allResults
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, max_results)
            .map((result) => ({
              content: result.content,
              relevanceScore: Math.round(result.relevanceScore * 100) / 100,
              source: result.source,
              type: result.type,
              timestamp: result.timestamp,
              metadata: result.metadata,
            })),
          processingTime: retrievalResponse.processingTime,
          // Create structured references for frontend visualization
          references: formatReferencesForFrontend(retrievalResponse),
        };

        console.log(
          `[EnhancedMemorySearch] Found ${result.totalResults} total results (${result.memories} memories, ${result.contents} contents)`,
        );

        // Add to tool results for frontend display
        response.toolResults.push({
          toolName: "searchMyContent",
          result: {
            query: result.query,
            memories: result.references || [], // Format references as memories for frontend compatibility
            numberOfResults: result.references ? result.references.length : result.memories,
            // Include additional details for debugging/UI
            contents: result.contents,
            processingTime: result.processingTime,
          },
        });

        return result;
      } catch (error) {
        console.error("[EnhancedMemorySearch] Error:", error);

        // Return fallback result
        const fallbackResult: EnhancedMemorySearchResult = {
          query,
          totalResults: 0,
          memories: 0,
          contents: 0,
          topResults: [],
          processingTime: 0,
          references: [],
        };

        response.toolResults.push({
          toolName: "searchMyContent",
          result: fallbackResult,
          error: "Search temporarily unavailable",
        });

        return fallbackResult;
      }
    },
  });
}

// Helper function to format references for frontend visualization
function formatReferencesForFrontend(retrievalResponse: any): Array<{
  id: string;
  content: string;
  source: string;
  type?: string;
  timestamp: string;
  relevanceScore: number;
  metadata: {
    app_id?: string;
    source: string;
    type?: string;
    link?: string;
    timestamp: string;
    ingested_at?: string;
    externalId?: string;
    conversationId?: number;
    role?: string;
  };
}> {
  const references: any[] = [];

  // Process memories from Mem0
  retrievalResponse.memories.forEach((memory: any) => {
    references.push({
      id: memory.id,
      content: memory.memory,
      source: "mem0",
      type: "memory",
      timestamp: memory.createdAt || new Date().toISOString(),
      relevanceScore: memory.relevanceScore || 0.9,
      metadata: {
        app_id: memory.metadata?.app_id || memory.metadata?.agent_id,
        source: memory.metadata?.source || "mem0",
        type: memory.metadata?.type || "memory",
        link: memory.metadata?.link || memory.metadata?.url,
        timestamp: memory.createdAt || new Date().toISOString(),
        ingested_at: memory.metadata?.ingested_at || new Date().toISOString(),
        externalId: memory.metadata?.externalId,
        ...memory.metadata,
      },
    });
  });

  // Process content from social_content and app_links
  retrievalResponse.contents.forEach((content: any) => {
    const isAppLink = content.source === "app_link";
    const isSocialContent = content.source === "social_content";

    references.push({
      id: `content_${content.id}`,
      content: content.content,
      source: content.source,
      type: content.type,
      timestamp: content.createdAt?.toISOString() || new Date().toISOString(),
      relevanceScore: content.relevanceScore || 0.7,
      metadata: {
        source: content.metadata?.socialSource || content.source,
        type: content.type,
        link:
          content.link ||
          (isSocialContent && content.metadata?.externalId
            ? generateSocialLink(content.metadata.socialSource, content.metadata.externalId)
            : content.metadata?.link),
        timestamp: content.createdAt?.toISOString() || new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        externalId: content.metadata?.externalId,
        ...content.metadata,
      },
    });
  });

  // Sort by relevance score and return top results
  return references.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10); // Limit to top 10 for performance
}

// Helper function to generate social media links
function generateSocialLink(source: string, externalId: string): string {
  if (!source || !externalId) return "";

  const linkMap: Record<string, string> = {
    linkedin: `https://linkedin.com/feed/update/${externalId}`,
    twitter: `https://twitter.com/status/${externalId}`,
    facebook: `https://facebook.com/${externalId}`,
    instagram: `https://instagram.com/p/${externalId}`,
    reddit: `https://reddit.com/comments/${externalId}`,
    medium: `https://medium.com/p/${externalId}`,
    github: `https://github.com/${externalId}`,
  };

  return linkMap[source.toLowerCase()] || "";
}
