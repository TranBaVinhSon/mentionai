"use server";

import { createOpenAI, openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export async function enhancePrompt(prompt: string): Promise<string> {
  const { object } = await generateObject({
    model: createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }).languageModel("gpt-4.1-mini"),
    schema: z.object({
      output: z.string(),
    }),
    system: `You are an expert in enhancing prompts. The input is the prompt and the output is the enhanced prompt which is more specific and detailed and clear.
    1. Don't need to return the the answer of the prompt, just enhance the prompt.
    2. Don't return the markdown format, just return the plain text.
    3. If the prompt include mentioned models such as @gpt-4.1-nano, @dall-e-3, DON'T remove the mentioned models.
    4. If the prompt is already clear and specific, just return the prompt.`,
    prompt: prompt,
  });
  return object.output;
}
