import { Injectable, Logger } from "@nestjs/common";
import { generateText } from "ai";
import { modelStringToLanguageModel } from "../../common/utils";
import { AppLinkRepository } from "../../../db/repositories/app-link.repository";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { z } from "zod";

// Define the schema for personality insights using zod - conservative approach
const personalityInsightsSchema = z.object({
  communicationStyle: z
    .string()
    .describe(
      "How does this person actually communicate based on their writing? (formal, casual, humorous, direct, etc.)",
    ),
  interests: z
    .array(z.string())
    .describe("What topics do they actually post about or mention? (Don't infer broader interests)"),
  values: z.array(z.string()).describe("What principles are directly expressed or clearly demonstrated?"),
  personality: z.string().describe("What personality traits are evident in their actual communication?"),
  experienceAreas: z
    .array(z.string())
    .describe(
      "What areas do they mention having worked with or on? (Use conservative language like 'has experience with')",
    ),
  tone: z
    .string()
    .describe("What emotional tone appears in their actual writing? (enthusiastic, thoughtful, witty, etc.)"),
  writingStyle: z.string().describe("How do they actually structure their posts and thoughts?"),
  commonTopics: z.array(z.string()).describe("What subjects do they literally discuss in the provided content?"),
});

export type PersonalityInsights = z.infer<typeof personalityInsightsSchema>;

@Injectable()
export class PersonalityBuilderService {
  private readonly logger = new Logger(PersonalityBuilderService.name);

  constructor(
    private readonly appLinkRepository: AppLinkRepository,
    private readonly socialContentRepository: SocialContentRepository,
  ) {}

  /**
   * Analyzes all ingested content for a user's app to build personality insights
   * @param userId The user ID
   * @param appId The app ID
   * @returns Personality insights extracted from the content
   */
  async buildPersonalityFromContent(userId: number, appId: number): Promise<PersonalityInsights> {
    try {
      this.logger.log(`Building personality for user ${userId}, app ${appId}`);

      // Retrieve all content for this app
      const allContent = await this.getAllContentForApp(appId);

      if (!allContent || allContent.length === 0) {
        this.logger.warn(`No content found for user ${userId}, app ${appId}`);
        return null;
      }

      // Analyze the content using AI
      const personalityInsights = await this.analyzeContentForPersonality(allContent);

      this.logger.log(`Successfully built personality insights for user ${userId}, app ${appId}`);

      return personalityInsights;
    } catch (error) {
      this.logger.error(`Error building personality for user ${userId}, app ${appId}:`, error.stack);
      return null;
    }
  }

  /**
   * Retrieves all content for a specific app from both social content and app links
   */
  private async getAllContentForApp(appId: number): Promise<string[]> {
    try {
      const contentItems: string[] = [];

      // Fetch all social content for this app
      const socialContents = await this.socialContentRepository.find({
        where: { appId },
        order: { createdAt: "DESC" },
      });

      // Add social content to the array
      for (const socialContent of socialContents) {
        if (socialContent.content) {
          // Include metadata about the content type and source
          const contentWithMetadata = `[${socialContent.source} ${socialContent.type}]: ${socialContent.content}`;
          contentItems.push(contentWithMetadata);
        }
      }

      // Fetch all app links with content for this app
      const appLinks = await this.appLinkRepository.find({
        where: { appId },
        order: { createdAt: "DESC" },
      });

      // Add app link content to the array
      for (const appLink of appLinks) {
        if (appLink.content) {
          // Include the link URL as context
          const contentWithMetadata = `[Link: ${appLink.link}]\n${appLink.content}`;
          contentItems.push(contentWithMetadata);
        }
      }

      this.logger.log(
        `Retrieved ${socialContents.length} social contents and ${appLinks.length} app links for app ${appId}`,
      );
      this.logger.log(`Total content items: ${contentItems.length}`);

      return contentItems;
    } catch (error) {
      this.logger.error(`Error retrieving content from database:`, error.stack);
      return [];
    }
  }

  /**
   * Uses AI to analyze content and extract personality insights with structured output
   */
  private async analyzeContentForPersonality(memories: string[]): Promise<PersonalityInsights> {
    const model = modelStringToLanguageModel("gpt-4.1-mini");
    if (!model) {
      throw new Error("Model not available for personality analysis");
    }

    const contentToAnalyze = memories.join("\n\n");

    const systemPrompt = `You are a conservative personality analyst. Analyze social media posts and content to extract ONLY what is clearly evidenced - avoid extrapolation or assumptions.

CRITICAL: Use evidence-bounded language. Do NOT overstate expertise or experience.

Extract the following, being conservative in your claims:

1. Communication Style: How does this person communicate based on their actual writing?
2. Interests: What topics do they actually post about or mention? (Don't infer broader interests)
3. Values: What principles are directly expressed or clearly demonstrated?
4. Personality: What traits are evident in their actual communication style?
5. Experience Areas: What do they mention having worked on or with? (Use "has experience with" not "expert in")
6. Tone: What emotional tone appears in their writing?
7. Writing Style: How do they actually structure their posts and thoughts?
8. Common Topics: What subjects do they literally discuss in the content?

LANGUAGE GUIDELINES - Use conservative phrasing:
- "has experience with" instead of "expert in"
- "mentions working with" instead of "specializes in" 
- "shows interest in" instead of "passionate about"
- "familiar with" instead of "deep knowledge of"
- "has worked on" instead of "extensive background in"

Only include insights with direct textual evidence. If something is mentioned once, don't extrapolate it into expertise.

You must respond with a valid JSON object that matches the following schema:
{
  "communicationStyle": "string describing communication style",
  "interests": ["array of interest strings"],
  "values": ["array of value strings"], 
  "personality": "string describing personality traits",
  "experienceAreas": ["array of experience strings using conservative language"],
  "tone": "string describing tone",
  "writingStyle": "string describing writing style",
  "commonTopics": ["array of topic strings"]
}`;

    try {
      // Use generateText for non-streaming text generation
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Please analyze the following content and extract personality insights:\n\n${contentToAnalyze}`,
          },
        ],
      });

      // Parse the JSON response and validate against schema
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const rawData = JSON.parse(jsonMatch[0]);
          // Validate against zod schema
          const validatedData = personalityInsightsSchema.parse(rawData);
          return validatedData;
        }
      } catch (parseError) {
        this.logger.warn("Failed to parse or validate personality analysis response:", parseError);
      }

      // Fallback to default if parsing/validation fails
      return this.getDefaultPersonalityInsights();
    } catch (error) {
      this.logger.error("Error analyzing content for personality:", error.stack);
      return this.getDefaultPersonalityInsights();
    }
  }

  /**
   * Generates an enhanced instruction prompt based on personality insights
   */
  async generatePersonalityEnhancedInstruction(
    originalInstruction: string,
    personalityInsights: PersonalityInsights,
  ): Promise<string> {
    const model = modelStringToLanguageModel("gpt-4.1-mini");
    if (!model) {
      return originalInstruction;
    }

    const systemPrompt = `You are creating a balanced AI persona instruction. You will be given:
1. An original instruction written by the user  
2. Conservative personality insights extracted from their content

Your task is to enhance the instruction while staying grounded in evidence and avoiding overstatement.

CRITICAL GUIDELINES - Avoid Expertise Inflation:
- Do NOT transform "has experience with X" into "expert in X" or "deep expertise in X"
- Do NOT claim "extensive background" from limited mentions
- Do NOT list technologies as "specializations" just because they're mentioned
- Use modest, evidence-based language throughout

CONSERVATIVE ENHANCEMENT APPROACH:
- If insights say "mentions TypeScript" → "has some experience with TypeScript" (NOT "TypeScript expert")
- If insights say "posts about startups" → "has startup experience" (NOT "startup ecosystem expert")
- Focus more on communication style and tone than claimed expertise
- Include uncertainty acknowledgment: "has experience in some areas but may not have detailed knowledge of everything"

BALANCED LANGUAGE:
- "has worked with" not "specializes in"
- "familiar with" not "expert in"  
- "shows interest in" not "passionate expert in"
- "some experience with" not "deep expertise in"

Keep the instruction authentic but realistic about knowledge boundaries. The goal is natural conversation, not expertise demonstration.

Return only the enhanced instruction text.`;

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Original instruction: "${originalInstruction}"

Personality insights:
- Communication Style: ${personalityInsights.communicationStyle}
- Interests: ${personalityInsights.interests.join(", ")}
- Values: ${personalityInsights.values.join(", ")}
- Personality: ${personalityInsights.personality}
- Experience Areas: ${personalityInsights.experienceAreas.join(", ")}
- Tone: ${personalityInsights.tone}
- Writing Style: ${personalityInsights.writingStyle}
- Common Topics: ${personalityInsights.commonTopics.join(", ")}

Please enhance the original instruction with these personality insights.`,
          },
        ],
      });

      return result.text.trim() || originalInstruction;
    } catch (error) {
      this.logger.error("Error generating enhanced instruction:", error.stack);
      return originalInstruction;
    }
  }

  /**
   * Returns default personality insights when analysis fails
   */
  private getDefaultPersonalityInsights(): PersonalityInsights {
    return {
      communicationStyle: "Natural and conversational",
      interests: [],
      values: [],
      personality: "Thoughtful and engaging",
      experienceAreas: [],
      tone: "Friendly and helpful",
      writingStyle: "Clear and articulate",
      commonTopics: [],
    };
  }
}
