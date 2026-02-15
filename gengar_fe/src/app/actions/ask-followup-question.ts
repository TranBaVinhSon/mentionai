"use server";

import { createOpenAI, openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function askFollowupQuestionOfHighlightedText(
  question: string,
  context?: string
): Promise<string> {
  let prompt = `Question: ${question}`;
  if (context) {
    prompt += `\n\nContext: ${context}`;
  }
  const { text } = await generateText({
    model: createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }).languageModel("gpt-4.1-mini"),
    system: `You are a helpful, respectful and honest AI assistant. Users are asking you questions about the text they have highlighted. Please try to provide the answer as detail as possible.`,
    prompt: prompt,
  });
  return text;
}
