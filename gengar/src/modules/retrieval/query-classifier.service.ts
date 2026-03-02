import { Injectable, Logger } from "@nestjs/common";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { ConfigService } from "@nestjs/config";

// Query intent types based on evaluation categories
export enum QueryIntent {
  FACTUAL_LOOKUP = "factual_lookup", // "Where did you work?", "What's your education?"
  RECENT_EVENTS = "recent_events", // "What did you post last week?"
  HISTORICAL_TIMELINE = "historical_timeline", // "Your opinion in 2022 vs now?"
  PERSONALITY_QUERY = "personality_query", // "What makes you excited?", "Describe yourself"
  OPINION_QUERY = "opinion_query", // "Your stance on remote work?"
  CONTENT_SEARCH = "content_search", // "Find all posts about AI"
  ANALYTICS_QUERY = "analytics_query", // "What topics do you post most?"
  CASUAL_CONVERSATION = "casual_conversation", // "How's your day?", "Hey!"
  UNCERTAINTY_TEST = "uncertainty_test", // "What did you have for breakfast?" (private info)
  STORY_REQUEST = "story_request", // "Tell me about a time when..."
}

// Temporal constraint types
export interface TemporalConstraint {
  type: "absolute" | "relative"; // "in 2022" vs "last week"
  startDate?: Date;
  endDate?: Date;
  recency: "recent" | "historical" | "any";
  recencyDays?: number; // For relative constraints: 7 for "last week", 30 for "last month"
}

// Query analysis result
export interface QueryAnalysis {
  intent: QueryIntent;
  entities: string[]; // Extracted entities: ["AI", "machine learning", "startups"]
  temporalConstraint?: TemporalConstraint;
  contentTypeFilter?: string[]; // ["post", "article", "comment"]
  sourceFilter?: string[]; // ["linkedin", "twitter", "facebook"] - extracted social media platforms
  requiresAggregation: boolean; // True for analytics queries
  expectedAnswerType: "specific_facts" | "opinions" | "content_list" | "summary" | "conversation";
  confidenceRequired: "high" | "medium" | "low"; // How confident we need to be
  requiresPrivateInfo: boolean; // True for uncertainty tests (breakfast, private conversations)
}

// Schema with enum validation for intent, with defaults and nullable fields
// to prevent AI_NoObjectGeneratedError when the LLM returns unexpected shapes
const queryAnalysisSchema = z.object({
  intent: z
    .enum([
      "factual_lookup",
      "recent_events",
      "historical_timeline",
      "personality_query",
      "opinion_query",
      "content_search",
      "analytics_query",
      "casual_conversation",
      "uncertainty_test",
      "story_request",
    ])
    .default("casual_conversation"),
  entities: z.array(z.string()).default([]),
  temporalConstraint: z
    .object({
      type: z.string(),
      recency: z.string(),
      recencyDays: z.number().optional(),
      yearMentioned: z.number().optional(),
    })
    .nullable()
    .optional(),
  contentTypeFilter: z.array(z.string()).nullable().default([]),
  sourceFilter: z.array(z.string()).nullable().default([]),
  requiresAggregation: z.boolean().default(false),
  expectedAnswerType: z.string().default("conversation"),
  confidenceRequired: z.string().default("low"),
  requiresPrivateInfo: z.boolean().default(false),
});

@Injectable()
export class QueryClassifierService {
  private readonly logger = new Logger(QueryClassifierService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Classify user query to determine retrieval strategy
   * Uses GPT-4o-mini model for reliable structured output generation
   */
  async classifyQuery(query: string): Promise<QueryAnalysis> {
    try {
      this.logger.log(`[QueryClassifier] Classifying query: "${query}"`);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - TS2589: Type instantiation is excessively deep with generateObject + Zod
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: queryAnalysisSchema,
        maxRetries: 3,
        prompt: `You are a query classifier for a digital clone system. Analyze the user query and classify it.

User Query: "${query}"

Classification Guidelines:

1. INTENT (REQUIRED - choose exactly ONE):
   - "factual_lookup": Questions about specific facts, education, work history, projects, locations
     Examples: "Where did you work?", "What's your degree in?", "Which companies have you worked for?"
   
   - "recent_events": Questions about recent activity or latest updates
     Examples: "What did you post last week?", "Summarize your recent posts", "What have you been up to lately?"
   
   - "historical_timeline": Questions comparing different time periods or tracking changes over time
     Examples: "How has your opinion on AI changed?", "Your stance in 2022 vs now?", "Career progression over the years?"
   
   - "personality_query": Questions about personality, values, characteristics, what excites/motivates them
     Examples: "What makes you excited?", "What are your values?", "How would you describe yourself?"
   
   - "opinion_query": Questions asking for stance, thoughts, or viewpoint on specific topics
     Examples: "What's your take on remote work?", "Your opinion on AI?", "How do you feel about startups?"
   
   - "content_search": Explicit requests to find or search for specific content
     Examples: "Find all posts about AI", "Show me articles on productivity", "Search for LinkedIn posts"
   
   - "analytics_query": Questions asking for statistics, counts, or aggregated information
     Examples: "What topics do you post about most?", "How many times mentioned AI?", "Top 5 most discussed themes?"
   
   - "casual_conversation": Casual greetings, small talk, or conversational phrases
     Examples: "Hey!", "How's it going?", "What's up?", "Good morning"
   
   - "uncertainty_test": Questions about private/personal information not in public content
     Examples: "What did you have for breakfast?", "Who did you meet with yesterday?", "What's your password?"
   
   - "story_request": Requests for narratives, experiences, or stories
     Examples: "Tell me about a time when...", "Share an experience about...", "Describe a situation where..."

2. ENTITIES (array of strings): Extract 2-5 key topics, concepts, or platforms mentioned
   Examples: ["AI", "machine learning"], ["LinkedIn", "posts"], ["remote work", "productivity"]

3. TEMPORAL CONSTRAINT (object or null): Extract time-related information if present
   - type: "relative" (last week, recently) or "absolute" (in 2022, June 2023)
   - recency: "recent" (last 30 days), "historical" (specific past period), or "any"
   - recencyDays: number of days (7 for last week, 30 for last month, 365 for last year)
   - yearMentioned: specific year if mentioned (2022, 2023, 2024)
   Set to null if no time constraint

4. CONTENT TYPE FILTER (array): Types of content if specified (empty array if not mentioned)
   Examples: ["post"], ["article", "comment"], []

5. SOURCE FILTER (CRITICAL - array): Social media platforms mentioned (lowercase, empty if none)
   Platforms: "linkedin", "twitter", "facebook", "reddit", "medium", "substack", "github", "instagram"
   Examples: ["linkedin"], ["twitter", "reddit"], []

6. REQUIRES AGGREGATION (boolean): true if asking for counts, statistics, "most", "top", "how many"

7. EXPECTED ANSWER TYPE (string): "specific_facts", "opinions", "content_list", "summary", or "conversation"

8. CONFIDENCE REQUIRED (string): "high" (factual), "medium" (opinions), or "low" (casual)

9. REQUIRES PRIVATE INFO (boolean): true only if asking about non-public personal information

Return valid JSON matching the schema.`,
      });

      const object = result.object;
      this.logger.log(`[QueryClassifier] Parsed object: ${JSON.stringify(object)}`);

      // Process temporal constraint to add dates
      const analysis: QueryAnalysis = {
        ...object,
        contentTypeFilter: object.contentTypeFilter || [],
        sourceFilter: object.sourceFilter || [],
        temporalConstraint: object.temporalConstraint
          ? this.processTemporalConstraint(object.temporalConstraint)
          : undefined,
      };

      this.logger.log(
        `[QueryClassifier] Query: "${query}" → Intent: ${analysis.intent}, Sources: [${
          analysis.sourceFilter?.join(", ") || "none"
        }]`,
      );
      return analysis;
    } catch (error) {
      this.logger.error("[QueryClassifier] Classification failed", error.stack);
      this.logger.error("[QueryClassifier] Error details:", {
        message: error.message,
        name: error.name,
        cause: error.cause,
      });

      // Return a safe default instead of crashing the entire retrieval pipeline
      this.logger.warn(`[QueryClassifier] Falling back to default classification for query: "${query}"`);
      return {
        intent: QueryIntent.CASUAL_CONVERSATION,
        entities: [],
        requiresAggregation: false,
        expectedAnswerType: "conversation",
        confidenceRequired: "low",
        requiresPrivateInfo: false,
        contentTypeFilter: [],
        sourceFilter: [],
      };
    }
  }

  /**
   * Process temporal constraint to add actual dates
   */
  private processTemporalConstraint(constraint: any): TemporalConstraint {
    const now = new Date();
    const result: TemporalConstraint = {
      type: constraint.type,
      recency: constraint.recency,
    };

    if (constraint.type === "relative" && constraint.recencyDays) {
      result.recencyDays = constraint.recencyDays;
      result.endDate = now;
      result.startDate = new Date(now.getTime() - constraint.recencyDays * 24 * 60 * 60 * 1000);
    } else if (constraint.type === "absolute" && constraint.yearMentioned) {
      result.startDate = new Date(`${constraint.yearMentioned}-01-01`);
      result.endDate = new Date(`${constraint.yearMentioned}-12-31`);
    }

    return result;
  }
}
