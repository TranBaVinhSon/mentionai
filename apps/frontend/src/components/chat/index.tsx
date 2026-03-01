"use client";

import { useQuery } from "@tanstack/react-query";
import {
  gengarApi,
  GengarSubscriptionPlan,
  InputSchema,
  OutputSchema,
} from "@/services/api";
import { useChat } from "@/hooks/use-chat";
import { type Message } from "ai/react";
import { usePathname, useRouter } from "next/navigation";
import { ChatMessage, Spinner, ToolResult } from "./chat-message";
import { ChatEditor } from "../chat-editor";
import clsx from "clsx";
import { MentionHighlight } from "@/components/mention-highlight";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarColor, getInitial } from "@/utils/avatar";
import {
  extractTextModelsFromRequest,
  extractAppIdsFromRequest,
} from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { useUser } from "@/hooks/use-user";
import { useLatest } from "@/hooks/use-latest";
import { AppForm } from "../app-form";
import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useChatStore } from "@/store/chat";
import { Separator } from "../ui/separator";
import { BACKEND_URL } from "@/utils/constants";
import { DebateStatus, DebateStatusType } from "./debate-status";
import dayjs from "dayjs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Share2, Sparkles, Lock, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const h1 = true;
const h2 = true;
const h3 = true;
const h4 = true;

// Define DebateState interface to fix type errors
interface DebateState {
  status: DebateStatusType;
  speaker: string | undefined;
  humanInputMessage?: string;
  error?: string;
  lastErrorModel?: string;
  lastErrorMessage?: string;
  currentRound?: number;
  lastSpeaker?: string;
}
// Extend the Message type to include debate-specific properties
interface DebateMessage extends Message {
  debateModel?: string;
  models?: string[];
  toolResults?: ToolResult[];
  experimental_attachments?: Array<{ url: string }>;
}

const getStableKey = (message: Message, idx: number) =>
  message.id ? `msg-${message.id}` : `msg-index-${idx}`;

export const ChatApp = ({
  id,
  title,
  initialMessages,
  isAnonymous,
  isDebateMode,
  showAnonymous,
  app,
  chat,
  className,
  disableDebateToggle = false,
  isConversationLoading = false,
}: {
  id: string;
  title?: string;
  initialMessages?: Message[];
  isAnonymous?: boolean;
  isDebateMode?: boolean;
  isWebSearchEnabled?: boolean;
  showAnonymous?: boolean;
  app?: {
    name: string;
    logo: string;
    uniqueId: string;
    displayName?: string;
    description?: string;
    inputSchema?: InputSchema;
    outputSchema?: OutputSchema;
  };
  chat?: {
    title: string;
    uniqueId: string;
    createdAt: string;
    messages: Message[];
    isDebate: boolean;
    isPublic?: boolean;
    app?: {
      name: string;
      logo: string;
      uniqueId: string;
      displayName?: string;
      description?: string;
      inputSchema?: InputSchema;
      outputSchema?: OutputSchema;
    };
  };
  className?: string;
  disableDebateToggle?: boolean;
  isConversationLoading?: boolean;
}) => {
  const { data: session, status } = useSession();
  const { data: user } = useUser();
  const path = usePathname();
  const router = useRouter();

  // State for conversation title received from SSE
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    title || null
  );

  // Track if this is a fresh conversation being created (no initial messages and no chat data)
  // Don't consider it fresh if we're still loading the conversation data
  const isFreshConversation =
    !isConversationLoading && !initialMessages?.length && !chat;

  console.log("[Chat] Conversation state:", {
    isFreshConversation,
    hasInitialMessages: !!initialMessages?.length,
    hasChat: !!chat,
    isConversationLoading,
    conversationId: id,
  });

  // Declare chat hook at the top before using messages

  const { messages, append, isLoading } = useChat({
    api: `${BACKEND_URL}/internal/api/v1/completions`,
    initialMessages,
    id,
    streamProtocol: "text" as const,
    onResponse: async (response: Response) => {
      console.log("[Chat] Response received:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });
    },
    onError: (error: Error) => {
      console.error("[Chat] Error in useChat:", error);
    },
    onFinish: (message, options) => {
      console.log("[Chat] Finished:", { message, options });
    },
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  const isLastUserMessage =
    messages?.length > 0 && messages[messages.length - 1].role === "user";
  const messagesRef = useLatest(messages || []);

  const formRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const getReadableState = () => {
    return {
      value: messagesRef.current.map((m) => m.content).join("\n"),
      description: "The conversation history",
    };
  };

  // Add state for debate mode
  const [debateState, setDebateState] = useState<DebateState>({
    status: "not-started",
    speaker: "",
  });

  // Add conversation title event handling
  useEffect(() => {
    const titleEventHandler = (e: CustomEvent) => {
      if (e.detail) {
        setConversationTitle(e.detail);
      }
    };

    window.addEventListener(
      "conversation-title",
      titleEventHandler as EventListener
    );

    return () => {
      window.removeEventListener(
        "conversation-title",
        titleEventHandler as EventListener
      );
    };
  }, []);

  // Add debate mode event handling
  useEffect(() => {
    if (!isDebateMode) return;

    // Listen for debate events via custom events dispatched by callChatApi
    const eventHandler = (e: CustomEvent) => {
      if (!e.detail) return;

      try {
        const data = JSON.parse(e.detail);

        switch (data.type) {
          case "debate-started":
            setDebateState({
              status: "started",
              speaker: "",
              humanInputMessage: undefined,
              error: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
              currentRound: undefined,
              lastSpeaker: undefined,
            });
            break;

          case "model-thinking-start":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              status: "thinking",
              speaker: data.displayName,
              humanInputMessage: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
            }));
            break;

          case "model-response-chunk":
            setDebateState((prevState: DebateState) => {
              let nextStatus = prevState.status;
              if (["thinking", "started"].includes(prevState.status)) {
                nextStatus = "in-progress";
              }
              return {
                ...prevState,
                status: nextStatus,
                speaker: data.displayName,
                humanInputMessage: undefined,
                lastErrorModel:
                  prevState.lastErrorModel === data.displayName
                    ? undefined
                    : prevState.lastErrorModel,
                lastErrorMessage:
                  prevState.lastErrorModel === data.displayName
                    ? undefined
                    : prevState.lastErrorMessage,
              };
            });
            break;

          case "model-response-complete":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              speaker: data.displayName,
            }));
            break;

          case "initial-debate-round-complete":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              status: "moderating",
              thinkingModels: [],
              nextSpeaker: undefined,
              humanInputMessage: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
            }));
            break;

          case "moderator-deciding":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              status: "moderating",
              thinkingModels: [],
              nextSpeaker: undefined,
              humanInputMessage: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
            }));
            break;

          // New event handlers:
          case "moderator-decision":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              nextSpeaker: data.nextSpeaker,
              humanInputMessage: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
            }));
            break;

          case "model-error":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              speaker: data.displayName,
              lastErrorModel: data.displayName,
              lastErrorMessage: data.error || "An unknown error occurred.",
            }));
            break;

          case "debate-round-complete":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              status: "round-complete",
              thinkingModels: [],
              currentRound: data.round,
              lastSpeaker: data.displayName,
              nextSpeaker: undefined,
              humanInputMessage: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
            }));
            break;

          case "awaiting-human-response":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              status: "awaiting-human-response",
              thinkingModels: [],
              humanInputMessage: data.message || "Waiting for your input...",
              nextSpeaker: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
            }));
            break;

          case "debate-ended":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              status: "ended",
              error: data.reason || undefined,
              thinkingModels: [],
              nextSpeaker: undefined,
              humanInputMessage: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
            }));
            break;

          // Treat model-thinking same as model-thinking-start
          case "model-thinking":
          case "model-thinking-start":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              status: "thinking",
              speaker: data.displayName,
              humanInputMessage: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
            }));
            break;

          // Handle the new paused state
          case "debate-paused":
            setDebateState((prevState: DebateState) => ({
              ...prevState,
              status: "debate-paused",
              speaker: undefined,
              humanInputMessage: undefined,
              lastErrorModel: undefined,
              lastErrorMessage: undefined,
            }));
            break;

          default:
            break;
        }
      } catch (e) {
        console.error("Error parsing SSE event", e);
      }
    };

    // Listen for our custom debate events
    window.addEventListener("debate-event", eventHandler as EventListener);

    return () => {
      window.removeEventListener("debate-event", eventHandler as EventListener);
    };
  }, [isDebateMode]);

  const isLastGroup =
    messages.length > 0 && messages[messages.length - 1].role === "user";
  const messagesRefChat = useLatest(messages);

  useEffect(() => {
    const updatePadding = () => {
      if (formRef.current && chatContainerRef.current) {
        const formHeight = formRef.current.offsetHeight;
        chatContainerRef.current.style.paddingBottom = `${formHeight + 10}px`;
      }
    };
    updatePadding();
    // Add resize observer to handle dynamic height changes
    const resizeObserver = new ResizeObserver(updatePadding);
    if (formRef.current) {
      resizeObserver.observe(formRef.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, [app?.inputSchema?.fields]);

  // Process messages for debate mode
  const processedMessages = isDebateMode
    ? messages.map((message: DebateMessage) => {
        if (message.role === "assistant" && message.id) {
          return {
            ...message,
            debateModel: message.models?.[0] || "",
            models: [(message as DebateMessage).models?.[0]],
          } as DebateMessage;
        }
        return message;
      })
    : messages;

  // New code: Group each message individually based on messageId (i.e. each message is its own group)
  const groupedMessages = processedMessages.map((message) => [message]);

  // Add loading message if the last message is from user and we're loading
  const displayedGroups = [...groupedMessages];

  if (
    isLoading &&
    processedMessages.length > 0 &&
    processedMessages[processedMessages.length - 1].role === "user"
  ) {
    const lastGroup = displayedGroups[displayedGroups.length - 1];
    if (lastGroup && lastGroup[0].role === "user") {
      // Create a loading message with app information
      const loadingMessage: any = {
        id: "loading",
        role: "assistant",
        content: "",
      };

      // If we have app info, add it to the loading message
      if (app || chat?.app) {
        loadingMessage.app = app || chat?.app;
      }

      lastGroup.push(loadingMessage);
    }
  }

  // Add the following near the top of the ChatApp component
  const debateModeRef = useRef(isDebateMode);
  useEffect(() => {
    debateModeRef.current = isDebateMode;
  }, [isDebateMode]);

  const isDeepThinkMode = useChatStore((state) => state.isDeepThinkMode);
  const deepThinkModeRef = useRef(isDeepThinkMode);
  useEffect(() => {
    deepThinkModeRef.current = isDeepThinkMode;
  }, [isDeepThinkMode]);

  const [isPublished, setIsPublished] = useState(chat?.isPublic || false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareButtonClicked, setShareButtonClicked] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    setIsPublished(chat?.isPublic || false);
  }, [chat?.isPublic]);

  const handleToggleShare = async () => {
    if (!chat?.uniqueId || isPublishing) return;

    setIsPublishing(true);
    setShareButtonClicked(true);

    // Show sparkles when sharing
    if (!isPublished) {
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 2500);
    }

    setTimeout(() => setShareButtonClicked(false), 1000);

    const targetState = !isPublished;
    try {
      await gengarApi.setConversationPublicStatus(chat.uniqueId, targetState);
      setIsPublished(targetState);

      toast({
        description: targetState
          ? "Conversation shared successfully!"
          : "Conversation unshared successfully!",
      });
    } catch (error) {
      console.error("Failed to update share status:", error);
      toast({
        title: `Failed to ${targetState ? "share" : "unshare"} conversation.`,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Show loading state only when loading an existing conversation (not for new conversations)
  if (
    isConversationLoading &&
    ((initialMessages && initialMessages.length > 0) || chat?.title || title)
  ) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 border-2 border-gray-300 border-t-gray-900 rounded-full" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-auto">
      <div className="flex flex-col h-full">
        <div
          className={clsx(
            "w-full grow flex flex-col items-center overflow-auto",
            className
          )}
        >
          <div
            className="w-full overflow-hidden"
            style={{ paddingBottom: "120px" }}
          >
            <div
              className="prose relative max-w-2xl md:max-w-3xl w-full mx-auto"
              ref={chatContainerRef}
            >
              <div className="flex items-center gap-2 mb-4 mt-4">
                {chat?.isDebate && (
                  <span className="bg-orange-400/15 text-orange-500 rounded-md px-2 py-1 text-xl font-semibold flex-shrink-0">
                    Debate
                  </span>
                )}
                <h2 className="text-ellipsis overflow-hidden dark:prose-invert flex items-center my-0 flex-grow">
                  {conversationTitle || chat?.title || ""}
                  {chat?.isDebate && chat?.uniqueId && (
                    <span className="ml-2 flex items-center">
                      {isPublished ? (
                        <Globe
                          size={24}
                          className="text-green-500 transition-all"
                          aria-label="Publicly shared"
                        />
                      ) : (
                        <Lock
                          size={24}
                          className="text-orange-500 transition-all"
                          aria-label="Not shared"
                        />
                      )}
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-1 pb-2">
                {/* Update Share/Unshare Button */}
                {chat?.isDebate && chat.uniqueId && (
                  <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-6 items-center z-50">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={handleToggleShare}
                            disabled={isPublishing}
                            className={cn(
                              "relative gap-1 overflow-hidden",
                              isPublished
                                ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 border-none shadow-md hover:shadow-lg"
                                : "bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 border-none shadow-md hover:shadow-lg",
                              isPublishing
                                ? "animate-pulse cursor-not-allowed opacity-70"
                                : "",
                              "transition-all duration-200 ease-in-out"
                            )}
                            aria-label={
                              isPublished
                                ? "Unshare from community"
                                : "Share to community"
                            }
                          >
                            {isPublished ? "Shared" : "Share"}
                            {showSparkles && (
                              <>
                                {/* Fancy starburst animation */}
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <Sparkles className="text-yellow-300 animate-pulse w-full h-full absolute opacity-70" />
                                </span>
                                {/* Multiple radiating circles */}
                                <span className="absolute w-6 h-6 rounded-full bg-yellow-200/50 animate-[ping_1s_ease-in-out_infinite] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                                <span className="absolute w-10 h-10 rounded-full bg-yellow-100/30 animate-[ping_1.4s_ease-in-out_infinite] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                                <span className="absolute w-14 h-14 rounded-full bg-white/20 animate-[ping_1.8s_ease-in-out_infinite] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                                {/* Diagonal light sweep */}
                                <span
                                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite] opacity-0"
                                  style={{ animationDelay: "0.2s" }}
                                />
                              </>
                            )}
                            <Share2
                              size={16}
                              className={cn(
                                "text-white z-10",
                                shareButtonClicked && "animate-bounce"
                              )}
                            />
                            {shareButtonClicked && !showSparkles && (
                              <span className="absolute inset-0 rounded-md animate-ping bg-white/20" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {isPublished
                              ? "Unshare from community"
                              : "Share to community"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                <p className="text-foreground/40 !text-sm ">
                  {chat?.createdAt
                    ? dayjs(chat.createdAt).format("MMM D, YYYY")
                    : dayjs(new Date()).format("MMM D, YYYY")}
                </p>
              </div>

              {/* Show DebateStatus component when in debate mode */}
              {isDebateMode && (
                <div className="mb-6">
                  <DebateStatus
                    status={debateState.status}
                    speaker={debateState.speaker || ""}
                    humanInputMessage={debateState.humanInputMessage}
                    error={debateState.error}
                    lastErrorModel={debateState.lastErrorModel}
                    lastErrorMessage={debateState.lastErrorMessage}
                    currentRound={debateState.currentRound}
                    lastSpeaker={debateState.lastSpeaker}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                {isDebateMode
                  ? // In debate mode, display messages vertically without grouping
                    processedMessages.map((message, idx) => (
                      <div key={message.id || idx} className="w-full">
                        {message.role === "user" ? (
                          <div className="flex not-prose items-start w-full">
                            <Avatar className="w-6 h-6 mr-4 mt-1 flex-shrink-0">
                              <AvatarImage src={session?.user?.image || ""} />
                              <AvatarFallback className={`text-white text-xs font-medium ${getAvatarColor(session?.user?.name || session?.user?.email || "U")}`}>
                                {getInitial(session?.user?.name || session?.user?.email || "U")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                              <div className="mb-2">
                                <p className="prose dark:prose-invert !leading-8 text-base font-medium">
                                  <MentionHighlight text={message.content} />
                                </p>
                              </div>
                              {message?.experimental_attachments &&
                                message.experimental_attachments.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {message.experimental_attachments.map(
                                      (attachment, i) => (
                                        <img
                                          key={i}
                                          src={attachment.url}
                                          alt="Uploaded content"
                                          className="rounded-lg w-[200px] h-[200px] object-cover"
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
                              isLoading={
                                isLoading &&
                                idx === processedMessages.length - 1
                              }
                              app={app || chat?.app}
                              isDebateMode={true}
                              conversationUniqueId={id}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  : // Non debate mode, use existing grouping behavior
                    displayedGroups.map((group, groupIdx) => {
                      const userMessage = group.find((m) => m.role === "user");
                      const aiResponses = group.filter(
                        (m) => m.role === "assistant"
                      );
                      const isMultiAIResponses = aiResponses.length > 1;
                      const isInComparisonMode = false; // Set based on your app's state

                      return (
                        <div
                          key={`group-${groupIdx}`}
                          className="w-full flex flex-col"
                        >
                          {userMessage && (
                            <div className="flex not-prose items-start w-full">
                              <Avatar className="w-6 h-6 mr-4 mt-1 flex-shrink-0">
                                <AvatarImage src={session?.user?.image || ""} />
                                <AvatarFallback>
                                  {session?.user?.name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-grow">
                                <div className="mb-2">
                                  <p className="prose dark:prose-invert !leading-8 text-base font-medium">
                                    <MentionHighlight
                                      text={userMessage.content}
                                    />
                                  </p>
                                </div>
                                {userMessage?.experimental_attachments &&
                                  userMessage?.experimental_attachments
                                    ?.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {userMessage.experimental_attachments.map(
                                        (attachment, i) => (
                                          <img
                                            key={i}
                                            src={attachment.url}
                                            alt="Uploaded content"
                                            className="rounded-lg w-[200px] h-[200px] object-cover"
                                          />
                                        )
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                          {/* AI responses */}
                          {isMultiAIResponses ? (
                            <div className="relative left-1/2 -translate-x-1/2 w-full md:w-[1200px] px-4">
                              <Carousel
                                opts={{
                                  align: "start",
                                  loop: false,
                                  watchDrag: isInComparisonMode,
                                }}
                                className="w-full"
                              >
                                <CarouselContent className="-ml-2 md:-ml-4">
                                  {aiResponses.map((message, idx) => (
                                    <CarouselItem
                                      key={getStableKey(message, idx)}
                                      className={clsx(
                                        "pl-2 md:pl-4",
                                        aiResponses.length === 1 &&
                                          "basis-full max-w-3xl mx-auto",
                                        aiResponses.length >= 2 &&
                                          "basis-full md:basis-1/2"
                                      )}
                                    >
                                      <div
                                        className={clsx(
                                          "rounded-lg border border-border/50 p-4",
                                          "hover:border-border/80 transition-colors",
                                          "bg-background/50 backdrop-blur-sm h-full"
                                        )}
                                      >
                                        <ChatMessage
                                          message={message}
                                          isLoading={
                                            isLoading &&
                                            groupIdx ===
                                              displayedGroups.length - 1 &&
                                            idx === aiResponses.length - 1
                                          }
                                          app={app || chat?.app}
                                          isDebateMode={false}
                                          conversationUniqueId={id}
                                        />
                                      </div>
                                    </CarouselItem>
                                  ))}
                                </CarouselContent>
                                <CarouselPrevious />
                                <CarouselNext />
                              </Carousel>
                            </div>
                          ) : (
                            <div className="w-full">
                              {aiResponses.map((message, idx) => (
                                <div key={getStableKey(message, idx)}>
                                  <ChatMessage
                                    message={message}
                                    isLoading={
                                      isLoading &&
                                      groupIdx === displayedGroups.length - 1 &&
                                      idx === aiResponses.length - 1
                                    }
                                    app={app || chat?.app}
                                    isDebateMode={false}
                                    conversationUniqueId={id}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed left-0 bottom-2 bg-background w-full items-center justify-center">
        <div
          ref={formRef}
          id="chat-editor"
          className="flex flex-col max-w-2xl md:max-w-3xl mx-auto px-4 md:px-0"
        >
          {/* {user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS && (
            <div className="h-12 border px-3 pb-3 md:pb-3 bg-muted rounded-t-lg space-x-2 flex items-center justify-between">
              <div className="text-xs truncate flex-1">
                Unlock the best models and unlimited features.
              </div>
              <button
                onClick={() => {
                  router.push("/pricing");
                }}
                className="text-orange-500 font-medium text-xs"
              >
                Upgrade Plan
              </button>
            </div>
          )} */}
          <div className="relative w-full z-[1] bg-background bottom-4">
            {app?.inputSchema?.fields ? (
              <AppForm
                fields={app.inputSchema.fields}
                onSubmit={async (values) => {
                  // Only prevent submission if it's a fresh conversation AND still loading
                  if (isFreshConversation && isConversationLoading) return;

                  const content = Object.entries(values)
                    .map(([fieldId, value]) => `${fieldId}: ${value}`)
                    .join("\n");

                  // Read directly from store to avoid ref timing issues
                  const currentIsDeepThinkMode =
                    useChatStore.getState().isDeepThinkMode;
                  const currentIsDebateMode =
                    useChatStore.getState().isDebateMode;

                  const appendBody = {
                    isAnonymous,
                    isDebateMode: currentIsDebateMode,
                    isDeepThinkMode: currentIsDeepThinkMode,
                    models: extractTextModelsFromRequest(
                      JSON.stringify(values)
                    ),
                    // Use newUniqueId for fresh conversations, conversationUniqueId for existing ones
                    ...(isFreshConversation
                      ? { newUniqueId: id }
                      : { conversationUniqueId: id }),
                    messageId: uuidv4(),
                    app: app.name,
                    inputs: Object.entries(values).map(([fieldId, value]) => ({
                      fieldId,
                      value,
                    })),
                  };

                  console.log("[Chat] Calling append (app form mode) with:", {
                    conversationId: id,
                    body: appendBody,
                    content,
                    app: app.name,
                  });

                  append(
                    {
                      content,
                      role: "user",
                    },
                    {
                      body: appendBody,
                    }
                  );

                  // If we're not already on a conversation page, redirect to it
                  if (!path?.includes("c")) {
                    const params = new URLSearchParams();
                    if (app) {
                      params.set("app", app.uniqueId);
                    }
                    const queryString = params.toString();
                    const url = `/c/${id}${
                      queryString ? `?${queryString}` : ""
                    }`;
                    window.history.pushState({}, "", url);
                  }
                }}
                className={
                  user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                    ? "-mt-px"
                    : "pt-2"
                }
              />
            ) : (
              <ChatEditor
                className={
                  user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                    ? "rounded-t-none border-t-0 -mt-px shadow-none"
                    : undefined
                }
                placeholder={
                  isDebateMode
                    ? "Ask the models a question..."
                    : "Send a message..."
                }
                showAnonymous={showAnonymous}
                disableDebateToggle={disableDebateToggle}
                getReadableState={getReadableState}
                onEnter={async (content, s3Links) => {
                  // Only prevent submission if it's a fresh conversation AND still loading
                  if (isFreshConversation && isConversationLoading) return;

                  const models = extractTextModelsFromRequest(content);

                  // Extract app IDs for debate mode
                  const apps = debateModeRef.current
                    ? extractAppIdsFromRequest(content)
                    : [];

                  // Read directly from store to avoid ref timing issues
                  const currentIsDeepThinkMode =
                    useChatStore.getState().isDeepThinkMode;
                  const currentIsDebateMode =
                    useChatStore.getState().isDebateMode;

                  const appendBody = {
                    isAnonymous,
                    isDebateMode: currentIsDebateMode,
                    isDeepThinkMode: currentIsDeepThinkMode,
                    models,
                    apps, // Include apps array for debate
                    // Use newUniqueId for fresh conversations, conversationUniqueId for existing ones
                    ...(isFreshConversation
                      ? { newUniqueId: id }
                      : { conversationUniqueId: id }),
                    messageId: uuidv4(),
                    inputs: [],
                  };

                  console.log("[Chat] Calling append (regular mode) with:", {
                    conversationId: id,
                    body: appendBody,
                    content,
                    hasAttachments: !!s3Links?.length,
                  });

                  append(
                    {
                      content,
                      role: "user",
                      experimental_attachments: s3Links?.map((url) => ({
                        url,
                      })),
                    },
                    {
                      body: appendBody,
                    }
                  );
                }}
                autoFocus={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Chat = ({
  id,
  isAnonymous,
  isWebSearchEnabled,
  disableDebateToggle = false,
  appParam,
}: {
  id: string;
  isAnonymous: boolean;
  isWebSearchEnabled?: boolean;
  disableDebateToggle?: boolean;
  appParam?: string;
}) => {
  const {
    data: chat,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => gengarApi.getConversation(id),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 3, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  }) as { data: any; error: any; isLoading: boolean };

  // Load public digital clone data if digitalCloneId is provided and no appParam
  const { data: publicDigitalClone, isLoading: digitalCloneLoading } = useQuery(
    {
      queryKey: ["publicDigitalClone", appParam],
      queryFn: () => gengarApi.getPublicDigitalClone(appParam || ""),
      enabled: !!appParam,
      staleTime: 1000 * 60 * 60, // 1 hour
    }
  );

  const isDebateMode = useChatStore((state) => state.isDebateMode);

  // Ensure chat has the right type structure
  const validChat =
    chat && typeof chat === "object" && "title" in chat ? chat : undefined;

  // Determine which app data to use - prefer chat app data, then appFromParam, then publicDigitalClone
  const appToUse = validChat?.app || publicDigitalClone;

  // Always render ChatApp - it will handle loading state internally
  // This prevents the loading spinner flash when transitioning from home page
  return (
    <ChatApp
      id={id}
      title={validChat?.title || ""}
      initialMessages={validChat?.messages || []}
      app={appToUse}
      isAnonymous={isAnonymous}
      isDebateMode={isDebateMode}
      isWebSearchEnabled={isWebSearchEnabled}
      chat={validChat}
      disableDebateToggle={disableDebateToggle}
      isConversationLoading={isLoading}
    />
  );
};
