"use client";
import { memo, PropsWithChildren } from "react";
import { MemoizedReactMarkdown } from "./markdown";
import { motion } from "framer-motion";
import { CodeBlock } from "./ui/codeblock";
import { cn } from "@/lib/utils";

export const REVEAL_ANIMATION_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 1,
      ease: "easeIn",
      delay: 0.1,
    },
  },
};

export const MDX = memo(
  ({
    messageId,
    children,
    animate,
  }: PropsWithChildren<{ messageId?: string; animate: boolean }>) => {
    const renderCode = (code: string, lang: string) => (
      <div className="not-prose my-2 w-full flex-shrink-0">
        <CodeBlock lang={lang} code={code?.toString()} />
      </div>
    );

    // Function to highlight @me mentions
    const highlightMentions = (text: string) => {
      const mentionRegex = /@me\b/g;
      const parts = text.split(mentionRegex);
      const matches = text.match(mentionRegex);
      
      if (!matches) {
        return <motion.span key={text}>{text}</motion.span>;
      }
      
      return (
        <motion.span key={text}>
          {parts.map((part, index) => (
            <span key={`${text}-${index}`}>
              {part}
              {matches[index] && (
                <span key={`${text}-mention-${index}`} className="rounded p-0.5 bg-orange-500/15 text-orange-500 border border-orange-200 dark:border-orange-500">
                  {matches[index]}
                </span>
              )}
            </span>
          ))}
        </motion.span>
      );
    };

    return (
      <article
        id={`message-${messageId}`}
        className={cn("prose dark:prose-invert max-w-none", "mdx")}
      >
        <MemoizedReactMarkdown
          renderer={{
            text: (text) => typeof text === 'string' ? highlightMentions(text) : text,
            paragraph: (children) => (
              <motion.p
                variants={REVEAL_ANIMATION_VARIANTS}
                animate={"visible"}
                initial={animate ? "hidden" : "visible"}
              >
                {children}
              </motion.p>
            ),
            list(children) {
              return (
                <motion.ul variants={REVEAL_ANIMATION_VARIANTS}>
                  {children}
                </motion.ul>
              );
            },
            code: renderCode,
          }}
          openLinksInNewTab
        >
          {children as string}
        </MemoizedReactMarkdown>
      </article>
    );
  }
);
