"use client";

import { Message } from "ai";
import { MDX } from "../mdx";
import { ChatActions } from "./chat-actions";
import ModelLogo from "../shared/model-logo";
import { LoadingText } from "./loading-text";
import { WebSearch } from "./web-search";
import mediumZoom from "medium-zoom";
import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { MyTooltip, Tooltip, TooltipTrigger } from "../ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { TextSelectionComment } from "./text-selection-comment";
import { MessageCircle } from "lucide-react";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { MemorySource } from "./memory-source";
import {
  DeepThinkProgress,
  type DeepThinkProgressData,
  type DeepThinkContextReference,
  type DeepThinkWebResult,
} from "./deep-think-progress";
import AppLogo from "../shared/app-logo";
import { ProfileHoverCard } from "../shared/profile-hover-card";
import { useUser } from "@/hooks/use-user";
import { getAvatarColor, getInitial } from "@/utils/avatar";

function getMediumZoomMargin() {
  const width = window.innerWidth;

  if (width < 500) {
    return 8;
  } else if (width < 800) {
    return 20;
  } else if (width < 1280) {
    return 30;
  } else if (width < 1600) {
    return 40;
  } else if (width < 1920) {
    return 48;
  } else {
    return 72;
  }
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5 animate-spin stroke-muted-foreground", className)}
    >
      <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12"></path>
    </svg>
  );
}

export interface ToolResult {
  toolName: string;
  result: {
    query: string;
    follow_up_questions: string | null;
    answer: string;
    images: string[];
    results: {
      title: string;
      url: string;
      content: string;
      score: number;
      raw_content: string | null;
    }[];
    response_time: number;
    memories?: MemorySource[];
    layerDetails?: any;
    references?: MemorySource[];
  };
}

export interface MemorySource {
  id: string;
  memory?: string; // For backward compatibility
  content?: string; // New field for enhanced search
  source?: string; // Source layer (memory, database, conversation, etc.)
  type?: string; // Content type (post, comment, message, document, etc.)
  timestamp?: string; // Content timestamp
  relevanceScore?: number; // Relevance score for enhanced search
  metadata: {
    link?: string;
    type?: string;
    app_id?: string;
    source?: string;
    timestamp?: string;
    ingested_at?: string;
    externalId?: string;
    conversationId?: number;
    role?: string;
    frequency?: number;
    confidence?: number;
    // Document-specific fields (for grouped chunks)
    origin?: string;
    totalChunks?: number;
    createdAt?: string;
    // Rich metadata from app_links
    title?: string;
    description?: string;
    favicon?: string;
    siteName?: string;
    image?: string;
  };
  createdAt?: string; // For backward compatibility
}

// Define DebateMessage interface for debate mode
export interface DebateMessage extends Message {
  debateModel?: string;
  displayName?: string;
}

export interface ChatMessageProps {
  isLoading?: boolean;
  message?: Message & {
    models?: string[];
    toolResults?: ToolResult[];
    debateModel?: string;
    displayName?: string;
    appDetails?: {
      appId: string;
      appName: string;
      appLogo: string | null;
    };
    app?: {
      name: string;
      logo: string;
      displayName?: string;
      description?: string;
    };
    memorySources?: MemorySource[];
    deepThinkProgress?: DeepThinkProgressData[];
  };
  conversationUniqueId?: string;
  app?: {
    name: string;
    logo: string;
    displayName?: string;
    description?: string;
  };
  isDebateMode?: boolean;
}

// Helper function to check if a message has a debate model
const hasDebateModel = (msg: ChatMessageProps["message"]): boolean => {
  return (
    !!msg &&
    (("debateModel" in msg && !!msg.debateModel) ||
      ("displayName" in msg && !!msg.displayName))
  );
};

// Helper function to get model name (either from debateModel or models array)
const getModelName = (msg: ChatMessageProps["message"]): string => {
  if (!msg) return "";
  if (msg.displayName) {
    return msg.displayName;
  } else if (msg.debateModel) {
    return msg.debateModel;
  } else if (msg.models && msg.models.length > 0) {
    return msg.models[0];
  }
  return "";
};

// Component to wrap ModelLogo with Avatar for consistent circular design
const AvatarModelLogo = ({
  model,
  size = 24,
}: {
  model: string;
  size?: number;
}) => {
  const modelLogo = <ModelLogo model={model} size={16} />;

  return (
    <Avatar className="h-6 w-6" data-no-zoom="true">
      {modelLogo ? (
        <AvatarFallback className="bg-background border border-border flex items-center justify-center avatar-image">
          <ModelLogo model={model} size={16} />
        </AvatarFallback>
      ) : (
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium avatar-image">
          {model.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

const ChatMessageComponent = ({
  isLoading,
  message,
  app,
  isDebateMode,
  conversationUniqueId,
}: ChatMessageProps) => {
  const [selectionState, setSelectionState] = useState<{
    text: string;
    position: { x: number; y: number };
    showComment: boolean;
  } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // Get current user to check if this is their digital clone
  const { data: user } = useUser();

  // Determine if this app belongs to the current user
  const currentAppName =
    message?.app?.name || app?.name || message?.appDetails?.appName || "";
  const isMe = user?.app?.name === currentAppName && !!user?.app?.isMe;

  // useAutoScroll({
  //   isLoading,
  //   content: message?.content,
  //   targetRef: messageRef,
  // });

  useEffect(() => {
    const zoom = mediumZoom(
      `#message-${message?.id} img:not([data-no-zoom]):not(.avatar-image)`,
      {
        margin: getMediumZoomMargin(),
        background: "rgba(0, 0, 0, 0.8)",
      }
    );

    return () => {
      zoom.detach();
    };
  }, [message?.id]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      !message?.id ||
      !messageRef.current
    )
      return;

    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const messageRect = messageRef.current.getBoundingClientRect();

    const x = rect.right - messageRect.left;
    const y = rect.top - messageRect.top;

    const newState = {
      text,
      position: { x, y },
      showComment: false,
    };
    setSelectionState(newState);
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (selectionState) {
      const newState = {
        text: selectionState.text,
        position: { ...selectionState.position },
        showComment: true,
      };
      setSelectionState(newState);
    }
  };

  // Determine if we should show app info or model info
  const hasAppInfo = app || message?.appDetails || message?.app;
  const shouldShowApp = hasAppInfo; // Show app avatar during loading in debate mode
  const modelName = getModelName(message);

  const personaContextReferences = useMemo<DeepThinkContextReference[]>(() => {
    if (!message?.memorySources || message.memorySources.length === 0) {
      return [];
    }

    const seen = new Set<string>();

    return message.memorySources.reduce<DeepThinkContextReference[]>(
      (acc, memory, index) => {
        const titleCandidate =
          memory.metadata?.title || memory.memory || memory.content || "";
        const title = titleCandidate.trim();
        if (!title) {
          return acc;
        }

        const url = memory.metadata?.link || undefined;
        let host: string | undefined;
        if (url) {
          try {
            host = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            host = undefined;
          }
        }

        const key =
          url ||
          (typeof memory.id === "string"
            ? memory.id
            : `memory-${memory.id ?? index}`);

        if (seen.has(key)) {
          return acc;
        }
        seen.add(key);

        const sourceName =
          memory.metadata?.source ||
          memory.source ||
          memory.metadata?.type ||
          undefined;

        const descriptionCandidate =
          memory.metadata?.description || memory.content || memory.memory || "";
        const description =
          descriptionCandidate.trim() && descriptionCandidate.trim() !== title
            ? descriptionCandidate.trim()
            : undefined;

        const favicon =
          memory.metadata?.favicon ||
          (host
            ? `https://www.google.com/s2/favicons?domain=${host}`
            : undefined);

        acc.push({
          id: key,
          title,
          description,
          source: sourceName,
          url,
          favicon,
          host,
          timestamp:
            memory.metadata?.timestamp ||
            memory.metadata?.createdAt ||
            memory.timestamp ||
            memory.createdAt,
        });

        return acc;
      },
      []
    );
  }, [message?.memorySources]);

  const webSearchResults = useMemo<DeepThinkWebResult[]>(() => {
    if (!message?.toolResults || message.toolResults.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const results: DeepThinkWebResult[] = [];

    message.toolResults.forEach((tool) => {
      if (tool.toolName !== "webSearch") {
        return;
      }
      const searchResults = tool.result?.results;
      if (!Array.isArray(searchResults)) {
        return;
      }

      searchResults.forEach((entry) => {
        if (!entry?.url) {
          return;
        }

        const url = entry.url;
        if (seen.has(url)) {
          return;
        }
        seen.add(url);

        let host: string | undefined;
        try {
          host = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          host = undefined;
        }

        const favicon = host
          ? `https://www.google.com/s2/favicons?domain=${host}`
          : undefined;

        results.push({
          url,
          title: entry.title || host || "Untitled result",
          snippet: entry.content || entry.raw_content || tool.result?.answer,
          host,
          favicon,
        });
      });
    });

    return results;
  }, [message?.toolResults]);

  const aggregatedWebSearchResult = useMemo(() => {
    if (webSearchResults.length === 0) {
      return null;
    }

    const webSearchQueries =
      message?.toolResults
        ?.filter((tool) => tool.toolName === "webSearch")
        .map((tool) => tool.result?.query)
        .filter(
          (query): query is string =>
            typeof query === "string" && query.trim().length > 0
        ) ?? [];

    return {
      query: webSearchQueries[0],
      results: webSearchResults.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.snippet || result.title,
        host: result.host,
        favicon: result.favicon,
      })),
    };
  }, [webSearchResults, message?.toolResults]);

  const toolResultsExcludingWebSearch = useMemo(() => {
    if (!message?.toolResults) {
      return [];
    }

    return message.toolResults.filter((tool) => tool.toolName !== "webSearch");
  }, [message?.toolResults]);

  return (
    <div
      ref={messageRef}
      className="relative group"
      id={`message-${message?.id}`}
      onMouseUp={handleTextSelection}
    >
      <div className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-4">
          {shouldShowApp ? (
            <ProfileHoverCard
              avatar={
                message?.app?.logo ||
                app?.logo ||
                message?.appDetails?.appLogo ||
                ""
              }
              displayName={
                message?.app?.displayName ||
                app?.displayName ||
                message?.appDetails?.appName ||
                app?.name ||
                message?.app?.name ||
                "Digital Clone"
              }
              username={
                message?.app?.name ||
                app?.name ||
                message?.appDetails?.appName ||
                ""
              }
              description={
                message?.app?.description ||
                app?.description ||
                `Digital clone trained on ${
                  message?.app?.displayName ||
                  app?.displayName ||
                  message?.appDetails?.appName ||
                  app?.name ||
                  message?.app?.name ||
                  "this user"
                }'s content and personality`
              }
              isPublished={true}
              isMe={isMe}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {message?.app?.logo ||
                  app?.logo ||
                  message?.appDetails?.appLogo ? (
                    <AvatarImage
                      src={
                        message?.app?.logo ||
                        app?.logo ||
                        message?.appDetails?.appLogo ||
                        ""
                      }
                      alt={
                        message?.app?.name ||
                        app?.name ||
                        message?.appDetails?.appName ||
                        ""
                      }
                      className="object-cover not-prose"
                    />
                  ) : null}
                  <AvatarFallback className={cn("text-white text-xs font-medium avatar-image", getAvatarColor(message?.app?.displayName || app?.displayName || message?.appDetails?.appName || app?.name || message?.app?.name || "A"))}>
                    {getInitial(message?.app?.displayName || app?.displayName || message?.appDetails?.appName || app?.name || message?.app?.name || "A")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {message?.app?.displayName ||
                    app?.displayName ||
                    message?.appDetails?.appName ||
                    app?.name ||
                    message?.app?.name}
                </span>
              </div>
            </ProfileHoverCard>
          ) : modelName ? (
            <MyTooltip
              side="top"
              contentClassName="max-w-[296px]"
              content={modelName}
            >
              <TooltipTrigger>
                <div className={isDebateMode ? "flex items-center" : ""}>
                  <AvatarModelLogo model={modelName} size={24} />
                  {isDebateMode && message && hasDebateModel(message) && (
                    <span className="ml-2 text-sm font-medium text-foreground">
                      {message.displayName || message.debateModel}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
            </MyTooltip>
          ) : null}
          <div className="flex items-center min-h-[20px]">
            {" "}
            {/* Fixed minimum height container */}
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Spinner className="h-4 w-4" /> {/* Consistent size */}
                <LoadingText />
              </div>
            ) : (
              <span className="text-sm prose dark:prose-invert text-foreground/40">
                Answer
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!isLoading && message && (
            <div className="flex-shrink-0">
              <ChatActions content={message.content || ""} />
            </div>
          )}
        </div>
      </div>
      {conversationUniqueId &&
        (message?.deepThinkProgress?.length || 0) > 0 && (
          <div className="mt-3">
            <DeepThinkProgress
              progressItems={message?.deepThinkProgress || []}
              conversationUniqueId={conversationUniqueId}
              contextReferences={personaContextReferences}
              webResults={webSearchResults}
            />
          </div>
        )}
      {(aggregatedWebSearchResult ||
        toolResultsExcludingWebSearch.length > 0) && (
        <div className="mt-4">
          {aggregatedWebSearchResult && (
            <WebSearch result={aggregatedWebSearchResult} />
          )}
          {toolResultsExcludingWebSearch.map((tool, index) => {
            if (tool.toolName === "memorySearch") {
              return (
                <MemorySource
                  key={`${tool.toolName}-${index}`}
                  memorySources={tool.result.references || []}
                />
              );
            }
            if (
              tool.toolName === "enhancedMemorySearch" ||
              tool.toolName === "searchMyContent"
            ) {
              return (
                <MemorySource
                  key={`${tool.toolName}-${index}`}
                  memorySources={tool.result.references || []}
                  isEnhanced={true}
                />
              );
            }
            if (tool.toolName === "proactiveMemorySearch") {
              return (
                <MemorySource
                  key={`${tool.toolName}-${index}`}
                  memorySources={tool.result.references || []}
                  isEnhanced={true}
                />
              );
            }
            return null;
          })}
        </div>
      )}
      {/* Display memory sources directly from message if available */}
      {message?.memorySources && message.memorySources.length > 0 && (
        <div className="mt-4">
          <MemorySource
            memorySources={message.memorySources}
            isEnhanced={true}
          />
        </div>
      )}
      {message && (
        <div className="mt-2 md:mb-12">
          <MDX animate={!!isLoading} messageId={message.id}>
            {message.content}
          </MDX>
        </div>
      )}
      {selectionState && !selectionState.showComment && (
        <div
          ref={iconRef}
          className="absolute cursor-pointer bg-black rounded-full p-1.5 shadow-sm z-[100]"
          style={{
            top: `${selectionState.position.y}px`,
            left: `${selectionState.position.x + 8}px`,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={handleIconClick}
        >
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
      )}
      {selectionState && selectionState.showComment && message?.id && (
        <TextSelectionComment
          messageId={message.id}
          selectedText={selectionState.text}
          position={{
            x: selectionState.position.x,
            y: selectionState.position.y - 10,
          }}
          onClose={() => setSelectionState(null)}
          removeHighlight={() => setSelectionState(null)}
        />
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ChatMessage = memo(
  ChatMessageComponent,
  (prevProps, nextProps) => {
    // Custom comparison to optimize re-renders
    return (
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.message?.id === nextProps.message?.id &&
      prevProps.message?.content === nextProps.message?.content &&
      prevProps.message?.role === nextProps.message?.role &&
      prevProps.app?.name === nextProps.app?.name &&
      prevProps.app?.logo === nextProps.app?.logo &&
      prevProps.isDebateMode === nextProps.isDebateMode &&
      // Check for changes in memory sources and tool results
      JSON.stringify(prevProps.message?.memorySources) ===
        JSON.stringify(nextProps.message?.memorySources) &&
      JSON.stringify(prevProps.message?.toolResults) ===
        JSON.stringify(nextProps.message?.toolResults)
    );
  }
);
