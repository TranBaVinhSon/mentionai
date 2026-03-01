import { openai } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { ConversationCategory } from "src/db/entities/conversation.entity";
import { z } from "zod";

export async function generateConversationTitle(prompt: string): Promise<string> {
  const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Create a short title with less than 8 words without any prefix or suffix for the conversation. You should ignore the model name are mentioned by '@' in the conversation: ${prompt}`,
  });

  return result.text;
}

// const signedUrl = "https://gengar-local.s3.ap-northeast-1.amazonaws.com/uploads/images/CH_05151_Original.jpg-dccfb34e-7bd8-4ff0-88e5-c0ba5e75c826?X-Amz-Algorithm=..."
// const key = extractS3Key(signedUrl);
// console.log(key); // Output: 1/uploads/images/CH_05151_Original.jpg-dccfb34e-7bd8-4ff0-88e5-c0ba5e75c826
export function extractS3KeyFromSignedUrl(signedUrl: string): string {
  try {
    // Create URL object to parse the signed URL
    const url = new URL(signedUrl);

    // Get the pathname (e.g., /uploads/images/filename.jpg-uuid)
    const pathname = url.pathname;

    // Remove leading slash and return full path
    return pathname.substring(1);
  } catch (error) {
    throw new Error("Invalid S3 signed URL format");
  }
}
