import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { readableState, textAfterCursor, textBeforeCursor, prompt } =
    await req.json();

  try {
    const result = await generateText({
      model: openai("gpt-4.1-mini"),
      messages: [
        {
          role: "assistant",
          content: `
    You are given a state of app and content that users want to write you need to provide a autocomplete suggestion text to continue writing user content with the following purpose: ${prompt}
    ONLY RETURN suggestion string to continue writing user content with the shortest and most complete content.
    DONT ANWSER user content like "sure, here is the suggestion" or anything like that.
    DONT RETURN ANYTHING ELSE (like markdown, html, tag etc.)`,
        },
        {
          role: "system",
          content: `${
            readableState.description
          }: ${readableState.value.toString()}`,
        },
        {
          role: "user",
          content: `<TextAfterCursor>${textAfterCursor}</TextAfterCursor>`,
        },
        {
          role: "user",
          content: `<TextBeforeCursor>${textBeforeCursor}</TextBeforeCursor>`,
        },
      ],
    });

    return Response.json({
      text: result.text,
    });
  } catch (error) {
    console.error(error);
    return Response.json({
      text: null,
    });
  }
}
