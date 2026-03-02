import { tool } from "ai";
import { z } from "zod";
import { MemoryService } from "src/modules/memory/memory.service";
import { User } from "src/db/entities/user.entity";
import { App } from "src/db/entities/app.entity";

interface MemorySearchResult {
  query: string;
  memories: Array<{
    id: string;
    memory: string;
    metadata?: Record<string, any>;
    createdAt: string;
  }>;
  numberOfResults: number;
}

export const memorySearchSchema = z.object({
  query: z.string().describe("The query to search for in user's memories"),
  max_results: z.number().optional().default(5).describe("The maximum number of memories to return (default: 5)"),
});

export function memorySearchAgent(
  response: {
    value: string;
    toolResults: any[];
  },
  memoryService: MemoryService,
  user: User,
  app?: App,
) {
  return (tool as any)({
    description:
      "Quick search through recent conversation memories and basic personal history. Use this for simple lookups when the user asks 'remember when...', references recent conversations, or needs basic context from past chats. For deeper analysis of social content, personality, or comprehensive content analysis, use enhancedMemorySearch instead.",
    inputSchema: memorySearchSchema,
    execute: async (params: any) => {
      const { query, max_results = 20 } = params;
      const memories = await memoryService.searchMemories(query, user.id, app?.id);

      // Limit results to max_results
      const limitedMemories = memories.slice(0, max_results);
      console.log("limitedMemories", JSON.stringify(limitedMemories, null, 2));

      const result: MemorySearchResult = {
        query,
        memories: limitedMemories.map((memory) => ({
          id: memory.id,
          memory: memory.memory,
          metadata: memory.metadata,
          createdAt: memory.created_at,
        })),
        numberOfResults: limitedMemories.length,
      };

      console.log("memory search results:", JSON.stringify(result, null, 2));

      response.toolResults.push({
        toolName: "memorySearch",
        result: result,
      });

      return result;
    },
  });
}
