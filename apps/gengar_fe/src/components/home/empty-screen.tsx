"use client";

import { useChat } from "@/hooks/use-chat";
import { ChatEditor } from "../chat-editor";

import { Chat, ChatApp } from "../chat";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  extractTextModelsFromRequest,
  extractAppIdsFromRequest,
} from "@/lib/utils";
import { Examples } from "./examples";
import { v4 as uuidv4 } from "uuid";
import { useChatStore } from "@/store/chat";
import {
  App,
  gengarApi,
  Model,
  SocialContentType,
  GengarSubscriptionPlan,
} from "@/services/api";
import { useUser } from "@/hooks/use-user";
import { useOfficialApp } from "@/hooks/use-digital-clone";
import { BACKEND_URL } from "@/utils/constants";
import {
  EventTypes,
  useEventListener,
  emitter,
} from "@/services/event-emitter";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  XIcon,
  Bot,
  Users,
  MessageSquare,
  Cpu,
  CheckIcon,
  Edit,
  User,
  Clock,
  Share2,
  Brain,
} from "lucide-react";
import { useModels } from "@/hooks/use-models";
import { setSignInDialog } from "@/store/app";
import { AppForm } from "../app-form";
import { MyTooltip, TooltipTrigger } from "../ui/tooltip";
import { Info as InformationCircleIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import ModelLogo from "../shared/model-logo";
import { Badge } from "../ui/badge";
import { toast } from "@/hooks/use-toast";
import { PersonalAIScreen } from "@/components/shared/personal-ai-screen";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { LoadingSpinner } from "../ui/loading-spinner";

// Extend the App type to include isMe property
interface MeApp extends App {
  isMe?: boolean;
  links?: string[];
}

export const EmptyScreen = ({ id }: { id: string }) => {
  const placeholder = "Ask anything! @mention to access AI models and apps";
  const path = usePathname();
  const idRef = useRef(id);
  const { data: session, status } = useSession();
  const isAnonymous = useChatStore((state) => state.isAnonymous);
  const isDebateMode = useChatStore((state) => state.isDebateMode);
  const isWebSearchEnabled = useChatStore((state) => state.isWebSearchEnabled);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [model, setModel] = useState<Model | null>(null);
  const [editorPlaceholder, setEditorPlaceholder] =
    useState<string>(placeholder);
  const models = useModels();
  const { data: user } = useUser();

  // Get app ID from search params
  const appId = searchParams?.get("app");

  // Use React Query hook for fetching official app
  const { data: officialApp, isLoading: appLoading } = useOfficialApp(
    appId || ""
  );

  // Transform the app data to include isMe flag if needed
  const app: MeApp | null = officialApp || null;

  const handleRemoveApp = () => {
    const newParams = new URLSearchParams(searchParams || "");
    newParams.delete("app");
    router.push(`/?${newParams.toString()}`);
  };

  const [hasRedirected, setHasRedirected] = useState(false);

  const { messages, append, setMessages } = useChat({
    api: `${BACKEND_URL}/internal/api/v1/completions`,
    streamProtocol: "text",
    id: idRef.current,
    onResponse() {
      if (
        !path?.startsWith("/c/") &&
        idRef.current &&
        !isAnonymous &&
        !hasRedirected
      ) {
        setHasRedirected(true);
        const params = new URLSearchParams();
        if (app) {
          params.set("app", app.uniqueId);
        }
        const queryString = params.toString();
        const url = `/c/${idRef.current}${
          queryString ? `?${queryString}` : ""
        }`;

        // Small delay to ensure first message chunk is processed
        setTimeout(() => {
          router.replace(url);
        }, 50);
      }
    },
    onError(error) {
      console.log(error);
    },
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  useEffect(() => {
    const modelName = searchParams?.get("model");

    if (modelName) {
      const selectedModel = models?.find((m) => m.name === modelName);
      if (selectedModel) {
        setModel(selectedModel);
        setEditorPlaceholder(`Message to ${selectedModel.displayName}`);
      }
    } else {
      setModel(null);
      if (app) {
        setEditorPlaceholder(`Message to ${app.displayName}`);
      } else if (!appId) {
        setEditorPlaceholder(placeholder);
      }
    }
  }, [searchParams, models, app, appId, placeholder]);

  useEventListener(EventTypes.NEW_CHAT, () => {
    idRef.current = uuidv4();
    setMessages([]);
  });

  // Define handleExampleClick after all hooks
  const handleExampleClick = (example: string) => {
    emitter.emit(EventTypes.SET_EDITOR_CONTENT, example);
  };

  // Show loading state while initializing or fetching app data
  if (appLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Me Mode Personal AI UI (using shared component) - handle this first to prevent UI flash
  if (app?.isMe) {
    return <PersonalAIScreen app={app} isPublicView={false} />;
  }

  // If there are messages, we want to show the chat app (for non-me mode)
  if (messages.length > 0) {
    return (
      <ChatApp
        id={idRef.current}
        title=""
        initialMessages={messages}
        isAnonymous={isAnonymous}
        isDebateMode={isDebateMode}
        isWebSearchEnabled={isWebSearchEnabled}
        app={
          app
            ? {
                name: app.name,
                logo: app.logo,
                uniqueId: app.uniqueId,
                inputSchema: app.inputSchema,
                outputSchema: app.outputSchema,
              }
            : undefined
        }
      />
    );
  }

  // Define all handler functions after hooks
  const handleFormSubmit = async (values: Record<string, any>) => {
    if (status === "unauthenticated") {
      setSignInDialog(true);
      return;
    }

    // Create the content string (for backwards compatibility)
    const content = Object.entries(values)
      .map(([fieldId, value]) => `${fieldId}: ${value}`)
      .join("\n");

    let models: string[] = [];
    if (model) {
      models = [model.name];
    }

    // Redirect will happen in onResponse callback

    // Append the message and wait for streaming to start
    await append(
      {
        content,
        role: "user",
      },
      {
        body: {
          newUniqueId: idRef.current,
          isAnonymous,
          isDebateMode: useChatStore.getState().isDebateMode,
          isDeepThinkMode: useChatStore.getState().isDeepThinkMode,
          models,
          messageId: uuidv4(),
          app: app?.name,
          isMe: app?.isMe,
        },
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen w-full relative">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="flex flex-col items-center w-full">
          {/* New Feature Badge - Mobile optimized */}
          <div className="w-full flex flex-col items-center gap-2 pt-3 pb-3 md:pt-4 md:pb-4">
            <button
              onClick={() => {
                if (status !== "authenticated") {
                  setSignInDialog(true);
                } else {
                  router.push("/apps/new?me=true");
                }
              }}
              className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-base md:text-sm font-medium transition-colors border border-green-500/20 hover:border-green-500/30"
            >
              <span className="hidden sm:inline">
                Building your own digital clone, in a minute →
              </span>
              <span className="sm:hidden">Build your digital clone →</span>
            </button>

            <Link
              href="https://mentionai.io/@sontbv"
              target="_blank"
              className="flex flex-col items-center gap-1 text-base md:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Talk with a digital clone</span>
              <div className="flex items-center gap-1.5">
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src="/digital_clone_avatar.jpeg"
                    alt="Digital Clone Avatar"
                  />
                  <AvatarFallback className="bg-gradient-to-r from-primary/20 to-accent/20 text-foreground font-semibold text-sm">
                    S
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-bold text-base md:text-sm">
                    @sontbv
                  </span>
                  <span className="text-sm md:text-xs text-muted-foreground">
                    Engineer
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Main content wrapper - Mobile-optimized padding */}
          <div className="flex flex-col items-center w-full pt-2 pb-12 md:pt-6 md:pb-20 max-w-2xl md:max-w-3xl mx-auto px-2 md:px-4">
            {/* Hero / greeting section */}
            {status === "unauthenticated" ? (
              <div className="flex flex-col items-center justify-center text-center gap-2 mb-6 md:mb-8">
                <div className="space-y-2 md:space-y-3">
                  {/* Mobile-optimized heading */}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground max-w-4xl mx-auto leading-tight">
                    Conversations
                    <br />
                    Beyond Limits.
                  </h1>
                  {/* Mobile-optimized paragraph */}
                  <p className="text-lg md:text-base lg:text-lg text-muted-foreground mt-1 md:mt-2 text-center">
                    Create multi-AI discussions between historical figures,
                    experts, and characters. Accessing to more than 30+ AI
                    models with single @mention.
                  </p>
                  {/* Mobile-optimized badge layout */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 text-base md:text-sm text-center pt-1 md:pt-2">
                    <Badge
                      variant="secondary"
                      className="px-2 py-1 md:px-3 md:py-1.5 text-sm md:text-xs"
                    >
                      @socrates{" "}
                      <span className="mx-1 text-muted-foreground">with</span>{" "}
                      @aristotle
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="px-2 py-1 md:px-3 md:py-1.5 text-sm md:text-xs"
                    >
                      @gpt-4o{" "}
                      <span className="mx-1 text-muted-foreground">with</span>{" "}
                      @claude-3-5-sonnet
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="px-2 py-1 md:px-3 md:py-1.5 text-sm md:text-xs"
                    >
                      @elon-musk{" "}
                      <span className="mx-1 text-muted-foreground">with</span>{" "}
                      @steve-jobs
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              // Mobile-optimized authenticated view
              <div className="flex flex-col items-center text-center gap-3 mb-6 md:gap-4 md:mb-8">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                  👋 Hi, {session?.user?.name ?? "there"}
                </h2>
                <p className="text-lg md:text-base lg:text-lg text-muted-foreground max-w-3xl px-2">
                  MentionAI is your unified interface to collaborate with
                  multiple AI models simultaneously. Bring different
                  perspectives together for faster, smarter results.
                </p>
              </div>
            )}

            {/* Mobile-optimized app banner */}
            {app && (
              <div className="flex items-center space-x-2 w-full p-2 md:p-3 border rounded-lg bg-background mb-3 md:mb-4 text-base md:text-sm">
                <img
                  src={app.logo}
                  alt={app.name}
                  width={16}
                  height={16}
                  className="rounded-full flex-shrink-0 md:w-5 md:h-5"
                />
                <div className="pr-4 md:pr-6 text-left overflow-hidden flex-grow">
                  <h3 className="font-semibold text-base md:text-sm truncate">
                    {app.displayName}{" "}
                    {app.description && (
                      <span className="text-base md:text-sm text-muted-foreground font-normal hidden sm:inline">
                        • {app.description}
                      </span>
                    )}
                  </h3>
                </div>
                <Button
                  onClick={handleRemoveApp}
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 w-6 md:h-7 md:w-7 rounded-full text-muted-foreground flex-shrink-0"
                  aria-label="Remove app"
                >
                  <XIcon size={12} className="md:w-3.5 md:h-3.5" />
                </Button>
              </div>
            )}

            {/* Desktop chat editor */}
            <Card
              id="chat-editor"
              className="hidden md:flex w-full mb-4 md:mb-6 focus-within:border-primary transition-colors duration-300"
            >
              <CardContent className="p-2 md:p-3 w-full">
                {app?.inputSchema?.fields ? (
                  <AppForm
                    fields={app.inputSchema.fields}
                    onSubmit={handleFormSubmit}
                    className="pt-2"
                  />
                ) : (
                  <ChatEditor
                    showAnonymous={true}
                    autoFocus
                    placeholder={editorPlaceholder}
                    // Adjusted text size potentially within ChatEditor component itself
                    // Assuming ChatEditor handles its internal responsiveness
                    onEnter={async (content, s3Links) => {
                      if (status === "unauthenticated") {
                        setSignInDialog(true);
                        return;
                      }

                      let models: string[] = [];
                      let apps: string[] = [];
                      const isDebateMode = useChatStore.getState().isDebateMode;

                      if (model) {
                        models = [model.name];
                      } else {
                        models = extractTextModelsFromRequest(content);

                        // Extract app IDs if in debate mode
                        if (isDebateMode) {
                          apps = extractAppIdsFromRequest(content);
                        }
                      }

                      // Check if user mentioned their digital clone (@me)
                      const hasMeMention = content
                        .toLowerCase()
                        .includes("@me");
                      const userHasDigitalClone =
                        user?.app?.isMe && user.app.uniqueId;

                      // Validate that at least 2 participants (models or apps) are mentioned in debate mode
                      // Special case: @me + one other participant is valid if user has a digital clone
                      const totalParticipants = models.length + apps.length;
                      const effectiveParticipants =
                        hasMeMention && userHasDigitalClone
                          ? totalParticipants + 1
                          : totalParticipants;

                      if (isDebateMode && effectiveParticipants < 2 && !model) {
                        toast({
                          title: "Debate Mode Requires Multiple Participants",
                          description:
                            "Please mention at least 2 models or apps with @mention to start a debate.",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Redirect will happen in onResponse callback

                      append(
                        {
                          content,
                          role: "user",
                          experimental_attachments: s3Links?.map((url) => ({
                            url,
                          })),
                        },
                        {
                          body: {
                            newUniqueId: idRef.current,
                            isAnonymous,
                            isDebateMode: useChatStore.getState().isDebateMode,
                            isDeepThinkMode:
                              useChatStore.getState().isDeepThinkMode,
                            isWebSearchEnabled,
                            models,
                            messageId: uuidv4(),
                            app: app?.name,
                            apps, // Include apps array for debate mode
                            inputs: [],
                          },
                        }
                      );
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Examples */}
            {!searchParams?.get("app") && (
              <Examples onExampleClick={handleExampleClick} />
            )}
            {/* Mobile fixed bottom input */}
            <div className="fixed bottom-2 left-0 right-0 md:hidden bg-background border-t">
              <div className="max-w-2xl mx-auto p-2">
                <Card className="md:flex w-full mb-4 md:mb-6 focus-within:border-primary transition-colors duration-300">
                  <CardContent className="p-2 md:p-3 w-full">
                    {app?.inputSchema?.fields ? (
                      <AppForm
                        fields={app.inputSchema.fields}
                        onSubmit={handleFormSubmit}
                        className="pt-2"
                      />
                    ) : (
                      <ChatEditor
                        showAnonymous={true}
                        autoFocus
                        placeholder={editorPlaceholder}
                        // Adjusted text size potentially within ChatEditor component itself
                        // Assuming ChatEditor handles its internal responsiveness
                        onEnter={async (content, s3Links) => {
                          if (status === "unauthenticated") {
                            setSignInDialog(true);
                            return;
                          }

                          let models: string[] = [];
                          let apps: string[] = [];
                          const isDebateMode =
                            useChatStore.getState().isDebateMode;

                          if (model) {
                            models = [model.name];
                          } else {
                            models = extractTextModelsFromRequest(content);

                            // Extract app IDs if in debate mode
                            if (isDebateMode) {
                              apps = extractAppIdsFromRequest(content);
                            }
                          }

                          // Check if user mentioned their digital clone (@me)
                          const hasMeMention = content
                            .toLowerCase()
                            .includes("@me");
                          const userHasDigitalClone =
                            user?.app?.isMe && user.app.uniqueId;

                          // Validate that at least 2 participants (models or apps) are mentioned in debate mode
                          // Special case: @me + one other participant is valid if user has a digital clone
                          const totalParticipants = models.length + apps.length;
                          const effectiveParticipants =
                            hasMeMention && userHasDigitalClone
                              ? totalParticipants + 1
                              : totalParticipants;

                          if (
                            isDebateMode &&
                            effectiveParticipants < 2 &&
                            !model
                          ) {
                            toast({
                              title:
                                "Debate Mode Requires Multiple Participants",
                              description:
                                "Please mention at least 2 models or apps with @mention to start a debate.",
                              variant: "destructive",
                            });
                            return;
                          }

                          // Redirect will happen in onResponse callback

                          append(
                            {
                              content,
                              role: "user",
                              experimental_attachments: s3Links?.map((url) => ({
                                url,
                              })),
                            },
                            {
                              body: {
                                newUniqueId: idRef.current,
                                isAnonymous,
                                isDebateMode:
                                  useChatStore.getState().isDebateMode,
                                isDeepThinkMode:
                                  useChatStore.getState().isDeepThinkMode,
                                isWebSearchEnabled,
                                models,
                                messageId: uuidv4(),
                                app: app?.name,
                                apps, // Include apps array for debate mode
                                inputs: [],
                              },
                            }
                          );
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Adjusted text size and gap */}
      <footer className="hidden md:block w-full bg-background border-t py-3 md:py-4">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 md:gap-4 text-base md:text-sm text-muted-foreground px-4">
          <Link
            href="https://x.com/mentionai"
            target="_blank"
            className="hover:text-primary"
          >
            Follow us
          </Link>
          <Link
            href="https://mentionai.featurebase.app/"
            target="_blank"
            className="hover:text-primary"
          >
            Feedback
          </Link>
          <Link
            href="https://discord.gg/tdECU5D8"
            target="_blank"
            className="hover:text-primary"
          >
            Discord
          </Link>
          <Link href="/terms-of-service" className="hover:text-primary">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-primary">
            Privacy Policy
          </Link>
          <Link href="/commerce-disclosure" className="hover:text-primary">
            Commerce Disclosure
          </Link>
        </div>
      </footer>
    </div>
  );
};
