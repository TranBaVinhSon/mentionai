import React from "react";
import { IMAGE_MODELS, TEXT_MODELS, ALL_MODELS } from "@/lib/utils";

export type Props = {
  text: string;
  highlightClassname?: string;
  className?: string;
};

export function MentionHighlight({ text, className }: Props) {
  /**
   * Regular expression to match mentions.
   *
   * Format: @name (for both models and apps)
   */
  const mentionRegex =
    /(?<![\w.\-:])@([a-zA-Z0-9.\-:]+(?: [a-zA-Z0-9.\-:]+)*?)(?=\s|$)/g;

  // Create a new approach that correctly handles adjacent mentions
  const parts: { text: string; isMention: boolean }[] = [];
  let lastIndex = 0;

  // Find all mentions
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    // Add the text before the mention
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isMention: false,
      });
    }

    // Add the mention
    const mentionText = match[0].substring(1); // Remove the @ symbol

    // Check if the mention (lowercased) is in the ALL_MODELS list or is the special @me mention
    const isModel = ALL_MODELS.includes(mentionText.toLowerCase());
    const isSpecialMention = mentionText.toLowerCase() === "me";

    parts.push({
      text: match[0],
      isMention: isModel || isSpecialMention,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last mention
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isMention: false,
    });
  }

  return (
    <span className="break-words w-full" style={{ wordBreak: "break-word" }}>
      {parts.map((part, index) => {
        if (part.isMention) {
          return (
            <span
              data-id={part.text.replace("@", "")}
              key={index}
              className="rounded p-0.5 bg-orange-500/15 text-orange-500 border border-orange-200 dark:border-orange-500 cursor-pointer"
            >
              {part.text}
            </span>
          );
        } else {
          return <span key={index}>{part.text}</span>;
        }
      })}
    </span>
  );
}
