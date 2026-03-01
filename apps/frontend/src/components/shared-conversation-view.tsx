"use client";

import { type Message } from "ai/react";
import dayjs from "dayjs";
import { useSession } from "next-auth/react";
import { ChatMessage, ToolResult } from "@/components/chat/chat-message";
import { MentionHighlight } from "@/components/mention-highlight";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarColor, getInitial } from "@/utils/avatar";
import { setSignInDialog } from "@/store/app";

// Define DisplayMessage
export interface DisplayMessage extends Message {
  debateModel?: string;
  models?: string[];
  toolResults?: ToolResult[];
  experimental_attachments?: Array<{ url: string }>;
}

// Define Conversation
export interface Conversation {
  id: string;
  messages: DisplayMessage[];
  title: string;
  createdAt: string;
  debateMetadata?: {
    participants: Array<{
      type: string;
      model?: string;
      app?: {
        id: number;
        logo: string | null;
        name: string;
        userId: number | null;
        category: string;
        uniqueId: string;
        createdAt: string;
        updatedAt: string;
        isOfficial: boolean;
        baseModelId: number | null;
        description: string;
        displayName: string;
        inputSchema: any;
        instruction: string;
        capabilities: string[];
        outputSchema: any;
      };
    }>;
  };
}

// getStableKey function
export const getStableKey = (message: Message, idx: number) =>
  message.id ? `msg-${message.id}` : `msg-index-${idx}`;

export default function SharedConversationView({ conversation }: { conversation: Conversation }) {
  const { data: session } = useSession();
  
  const createdAtDate = conversation.createdAt
    ? new Date(conversation.createdAt)
    : null;

  const messages = conversation.messages;

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="flex-1 p-4 md:p-6 pb-36">
        <div className="prose relative max-w-full w-full dark:prose-invert mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 mt-0">
            <span className="bg-blue-400/15 text-blue-500 rounded-md px-2 py-1 text-sm font-semibold flex-shrink-0 w-fit">
              Shared
            </span>
            <h2 className="text-ellipsis overflow-hidden flex items-center my-0">
              {conversation.title || "Shared Conversation"}
            </h2>
          </div>
          {createdAtDate && (
            <p className="text-foreground/40 !text-sm pb-4 -mt-2">
              Created on: {dayjs(createdAtDate).format("MMM D, YYYY")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {messages.map((message: DisplayMessage, idx: number) => (
            <div key={getStableKey(message, idx)} className="w-full">
              {message.role === "user" ? (
                <div className="flex not-prose items-start w-full">
                  <Avatar className="w-6 h-6 mr-4 mt-1 flex-shrink-0">
                    <AvatarFallback className={`text-white text-xs font-medium ${getAvatarColor("User")}`}>U</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <div className="prose dark:prose-invert !leading-8 text-base font-medium">
                      <MentionHighlight text={message.content} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <ChatMessage
                    message={message}
                    isLoading={false}
                    isDebateMode={true}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center gap-2 bg-black text-white rounded-md shadow-lg p-2">
        {!session && (
          <div
            className="cursor-pointer hover:opacity-90 text-center"
            onClick={() => {
              setSignInDialog(true);
            }}
          >
            <p>Sign up to start debating with 30+ AI models</p>
            <p className="text-xs text-muted-foreground">
              It&apos;s free and only take 10 seconds
            </p>
          </div>
        )}

        {session && <p>Viewing shared conversation</p>}
      </div>
    </div>
  );
}
