// src/components/chat/shared-chat-view.tsx
"use client";

import { type Message } from "ai/react";
import { ChatMessage, ToolResult } from "./chat-message";
import clsx from "clsx";
import { MentionHighlight } from "@/components/mention-highlight";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "../ui/separator";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";

// Assume Conversation interface exists (or define it based on api.ts)
interface Conversation {
  id: string;
  messages: DisplayMessage[];
  // Add other relevant fields if needed (e.g., user info if available/needed)
  app?: {
    name: string;
    logo: string;
    displayName?: string;
  };
}

// Extend Message type if needed for specific rendering properties
interface DisplayMessage extends Message {
  debateModel?: string;
  models?: string[];
  toolResults?: ToolResult[];
  experimental_attachments?: Array<{ url: string }>;
  // Add potential user info fields if available in shared data
  // userName?: string;
  // userImage?: string;
}

const getStableKey = (message: Message, idx: number) =>
  message.id ? `msg-${message.id}` : `msg-index-${idx}`;

interface SharedChatViewProps {
  conversation: Conversation;
  className?: string;
}

export default function SharedChatView({
  conversation,
  className,
}: SharedChatViewProps) {
  if (
    !conversation ||
    !conversation.messages ||
    conversation.messages.length === 0
  ) {
    return (
      <div className="p-4 text-center text-gray-500">
        No messages to display.
      </div>
    );
  }

  const messages = conversation.messages;

  return (
    <div className={clsx("flex flex-col h-full relative", className)}>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-36">
        <div className="flex flex-col gap-6">
          {messages.map((message, idx) => (
            <div key={getStableKey(message, idx)} className="w-full">
              {message.role === "user" ? (
                <div className="flex not-prose items-start w-full">
                  <Avatar className="w-6 h-6 mr-4 mt-1 flex-shrink-0">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <div className="mb-2">
                      <div className="prose dark:prose-invert !leading-8 text-base font-medium">
                        <MentionHighlight text={message.content} />
                      </div>
                    </div>
                    {message?.experimental_attachments &&
                      message.experimental_attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.experimental_attachments.map(
                            (attachment, i) => (
                              <Image
                                key={i}
                                src={attachment.url}
                                alt="Uploaded content"
                                width={200}
                                height={200}
                                className="rounded-lg object-cover"
                                unoptimized
                              />
                            )
                          )}
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <ChatMessage
                    message={message}
                    isLoading={false}
                    isDebateMode={true}
                    app={conversation.app}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm px-3.5 py-1.5 rounded-full shadow-lg z-10">
        Viewing Shared Conversation
      </div>
    </div>
  );
}
