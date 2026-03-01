"use client";

import { useChat } from "@/hooks/use-chat";
import { ChatEditor } from "@/components/chat-editor";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { useChatStore } from "@/store/chat";
import { App, GengarSubscriptionPlan } from "@/services/api";
import { useUser } from "@/hooks/use-user";
import { BACKEND_URL } from "@/utils/constants";
import {
  EventTypes,
  useEventListener,
  emitter,
} from "@/services/event-emitter";
import Link from "next/link";
import { Edit, Share, ArrowRight, BarChart } from "lucide-react";
import { setSignInDialog } from "@/store/app";
import { AppForm } from "@/components/app-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SocialSourcesContent } from "@/components/social-sources-content";
import { SocialNetworkType } from "@/services/api";
import { LinkSource } from "@/components/shared/link-source";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { DigitalCloneSuggestedQuestions } from "@/components/shared/digital-clone-suggested-questions";
import { SourceDetailsSheet } from "@/components/source-details-sheet";
import {
  useSuggestedQuestions,
  usePublishedAppSuggestedQuestions,
  DEFAULT_SUGGESTED_QUESTIONS,
} from "@/hooks/use-suggested-questions";
import { TruncatedDescription } from "@/components/shared/truncated-description";
import { UpgradeDialog } from "@/components/shared/upgrade-dialog";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitial } from "@/utils/avatar";

// Helper function to get social media URLs
function getSocialMediaUrl(type: SocialNetworkType, username: string): string {
  switch (type) {
    case SocialNetworkType.FACEBOOK:
      return `https://facebook.com/${username}`;
    case SocialNetworkType.INSTAGRAM:
      return `https://instagram.com/${username}`;
    case SocialNetworkType.THREADS:
      return `https://threads.net/@${username}`;
    case SocialNetworkType.LINKEDIN:
      return `https://linkedin.com/in/${username}`;
    case SocialNetworkType.REDDIT:
      return `https://reddit.com/user/${username}`;
    case SocialNetworkType.MEDIUM:
      return `https://medium.com/@${username}`;
    case SocialNetworkType.GMAIL:
      return `mailto:${username}`;
    case SocialNetworkType.GITHUB:
      return `https://github.com/${username}`;
    case SocialNetworkType.GOODREADS:
      return `https://www.goodreads.com/user/show/${username}`;
    case SocialNetworkType.PRODUCTHUNT:
      return `https://producthunt.com/@${username}`;
    case SocialNetworkType.TWITTER:
      return `https://x.com/${username}`;
    default:
      return "#";
  }
}

// Helper function to get display name for social networks
function getSocialNetworkDisplayName(type: SocialNetworkType): string {
  switch (type) {
    case SocialNetworkType.FACEBOOK:
      return "Facebook";
    case SocialNetworkType.INSTAGRAM:
      return "Instagram";
    case SocialNetworkType.THREADS:
      return "Threads";
    case SocialNetworkType.LINKEDIN:
      return "LinkedIn";
    case SocialNetworkType.GMAIL:
      return "Gmail";
    case SocialNetworkType.REDDIT:
      return "Reddit";
    case SocialNetworkType.MEDIUM:
      return "Medium";
    case SocialNetworkType.GITHUB:
      return "GitHub";
    case SocialNetworkType.GOODREADS:
      return "Goodreads";
    case SocialNetworkType.PRODUCTHUNT:
      return "ProductHunt";
    case SocialNetworkType.TWITTER:
      return "Twitter";
    default:
      return String(type).charAt(0).toUpperCase() + String(type).slice(1);
  }
}

// Helper function to get brand colors for social networks
function getSocialNetworkColors(type: SocialNetworkType): {
  borderColor: string;
  backgroundColor: string;
  hoverBackgroundColor: string;
} {
  switch (type) {
    case SocialNetworkType.FACEBOOK:
      return {
        borderColor: "rgba(24, 119, 242, 0.5)",
        backgroundColor: "rgba(24, 119, 242, 0.1)",
        hoverBackgroundColor: "rgba(24, 119, 242, 0.15)",
      };
    case SocialNetworkType.INSTAGRAM:
      return {
        borderColor: "rgba(228, 64, 95, 0.5)",
        backgroundColor: "rgba(228, 64, 95, 0.1)",
        hoverBackgroundColor: "rgba(228, 64, 95, 0.15)",
      };
    case SocialNetworkType.THREADS:
      return {
        borderColor: "rgba(0, 0, 0, 0.5)",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        hoverBackgroundColor: "rgba(0, 0, 0, 0.15)",
      };
    case SocialNetworkType.LINKEDIN:
      return {
        borderColor: "rgba(10, 102, 194, 0.5)",
        backgroundColor: "rgba(10, 102, 194, 0.1)",
        hoverBackgroundColor: "rgba(10, 102, 194, 0.15)",
      };
    case SocialNetworkType.GMAIL:
      return {
        borderColor: "rgba(234, 67, 53, 0.5)",
        backgroundColor: "rgba(234, 67, 53, 0.1)",
        hoverBackgroundColor: "rgba(234, 67, 53, 0.15)",
      };
    case SocialNetworkType.REDDIT:
      return {
        borderColor: "rgba(255, 69, 0, 0.5)",
        backgroundColor: "rgba(255, 69, 0, 0.1)",
        hoverBackgroundColor: "rgba(255, 69, 0, 0.15)",
      };
    case SocialNetworkType.MEDIUM:
      return {
        borderColor: "rgba(0, 0, 0, 0.5)",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        hoverBackgroundColor: "rgba(0, 0, 0, 0.15)",
      };
    case SocialNetworkType.GITHUB:
      return {
        borderColor: "rgba(36, 41, 46, 0.5)",
        backgroundColor: "rgba(36, 41, 46, 0.1)",
        hoverBackgroundColor: "rgba(36, 41, 46, 0.15)",
      };
    case SocialNetworkType.PRODUCTHUNT:
      return {
        borderColor: "rgba(218, 85, 47, 0.5)",
        backgroundColor: "rgba(218, 85, 47, 0.1)",
        hoverBackgroundColor: "rgba(218, 85, 47, 0.15)",
      };
    case SocialNetworkType.SUBSTACK:
      return {
        borderColor: "rgba(255, 109, 0, 0.5)",
        backgroundColor: "rgba(255, 109, 0, 0.1)",
        hoverBackgroundColor: "rgba(255, 109, 0, 0.15)",
      };
    case SocialNetworkType.GOODREADS:
      return {
        borderColor: "rgba(139, 69, 19, 0.5)",
        backgroundColor: "rgba(139, 69, 19, 0.1)",
        hoverBackgroundColor: "rgba(139, 69, 19, 0.15)",
      };
    case SocialNetworkType.TWITTER:
      return {
        borderColor: "rgba(29, 161, 242, 0.5)",
        backgroundColor: "rgba(29, 161, 242, 0.1)",
        hoverBackgroundColor: "rgba(29, 161, 242, 0.15)",
      };
    default:
      return {
        borderColor: "hsl(var(--border))",
        backgroundColor: "transparent",
        hoverBackgroundColor: "hsl(var(--accent))",
      };
  }
}

interface MeApp extends App {
  isMe?: boolean;
  links?: string[];
  isPublished?: boolean;
  userId?: number;
}

interface PersonalAIScreenProps {
  app: MeApp;
  username?: string;
  isPublicView?: boolean;
}

export const PersonalAIScreen = ({
  app,
  username,
  isPublicView = false,
}: PersonalAIScreenProps) => {
  const path = usePathname();
  const id = uuidv4();
  const idRef = useRef(id);
  const { data: session, status } = useSession();
  const isAnonymous = useChatStore((state) => state.isAnonymous);
  const isDebateMode = useChatStore((state) => state.isDebateMode);
  const isWebSearchEnabled = useChatStore((state) => state.isWebSearchEnabled);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user } = useUser();

  // Add refs for dynamic padding
  const formRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [hasRedirected, setHasRedirected] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{
    type: SocialNetworkType;
    username: string;
  } | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Handle dashboard access with free plan restrictions
  const handleDashboardClick = () => {
    if (user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS) {
      setShowUpgradeDialog(true);
    } else {
      router.push(`/apps/${app.uniqueId}/dashboard`);
    }
  };

  // Get app links (metadata now comes from database)
  const appLinks = isPublicView ? app?.appLinks : user?.app?.appLinks;

  const { messages, append, setMessages } = useChat({
    api: `${BACKEND_URL}/internal/api/v1/completions`,
    streamProtocol: "text",
    id: idRef.current,
    onError(error) {
      console.log(error);
    },
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  useEventListener(EventTypes.NEW_CHAT, () => {
    idRef.current = uuidv4();
    setMessages([]);
  });

  // Fetch suggested questions using React Query
  const { data: authenticatedQuestions, isLoading: isLoadingAuthQuestions } =
    useSuggestedQuestions(!isPublicView ? app?.uniqueId : undefined);

  const { data: publicQuestions, isLoading: isLoadingPublicQuestions } =
    usePublishedAppSuggestedQuestions(isPublicView ? app?.name : undefined);

  // Determine which data to use
  const questionsData = isPublicView ? publicQuestions : authenticatedQuestions;
  const isLoadingQuestions = isPublicView
    ? isLoadingPublicQuestions
    : isLoadingAuthQuestions;
  const suggestedQuestions = questionsData?.questions;

  // Add dynamic padding for fixed input (like Chat component)
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
  }, [app]);

  const handleChatSubmit = async (content: string, s3Links?: string[]) => {
    if (status === "unauthenticated") {
      setSignInDialog(true);
      return;
    }

    // Optimistic navigation - redirect immediately
    if (
      !path?.startsWith("/c/") &&
      idRef.current &&
      !isAnonymous &&
      !hasRedirected
    ) {
      setHasRedirected(true);
      const params = new URLSearchParams();

      if (app?.userId !== user?.userId) {
        params.set("app", app.uniqueId);
      }
      const queryString = params.toString();
      const url = `/c/${idRef.current}${queryString ? `?${queryString}` : ""}`;

      // Small delay to ensure smooth transition
      router.replace(url);
    }

    const currentIsDeepThinkMode = useChatStore.getState().isDeepThinkMode;
    const currentIsDebateMode = useChatStore.getState().isDebateMode;

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
          isDebateMode: currentIsDebateMode,
          isDeepThinkMode: currentIsDeepThinkMode,
          isWebSearchEnabled,
          models: [],
          messageId: uuidv4(),
          app: app?.name,
          inputs: [],
        },
      }
    );
  };

  return (
    <div className="flex flex-col w-full h-full overflow-auto">
      <div className="flex flex-col h-full">
        <div className="w-full grow flex flex-col items-center overflow-auto">
          <div className="w-full overflow-hidden">
            <div
              className="relative max-w-2xl md:max-w-3xl w-full mx-auto px-4 py-6 md:py-8"
              ref={chatContainerRef}
            >
              {/* Header with avatar, name and badge */}
              <div className="w-full space-y-4 md:space-y-6">
                {/* Mobile centered layout */}
                <div className="md:hidden">
                  <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                    {/* Avatar centered */}
                    <div className="relative">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-3 md:border-4 border-white dark:border-black shadow-sm">
                        {app.logo ? (
                          <img
                            src={app.logo}
                            alt={app.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={cn("w-full h-full flex items-center justify-center text-white font-bold text-3xl md:text-4xl", getAvatarColor(app.displayName || app.name))}>
                            {getInitial(app.displayName || app.name)}
                          </div>
                        )}
                      </div>
                      <div
                        className={`absolute bottom-0.5 right-0.5 md:bottom-1 md:right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white dark:border-black ${
                          isPublicView
                            ? "bg-green-500"
                            : app.isPublished
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      ></div>
                    </div>

                    {/* Name and username centered */}
                    <div className="space-y-1">
                      <h1 className="text-xl md:text-2xl font-bold">
                        {app.displayName}
                      </h1>
                      {isPublicView && username && (
                        <p className="text-sm md:text-base text-muted-foreground">
                          @{username}
                        </p>
                      )}
                    </div>

                    {/* Share and status for public view */}
                    {isPublicView && (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={app.isPublished ? "default" : "secondary"}
                          className="text-xs md:text-sm px-2 py-1 md:px-3 md:py-1.5"
                        >
                          {app.isPublished ? "Published" : "Private"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const currentUrl = window.location.href;
                            navigator.clipboard
                              .writeText(currentUrl)
                              .then(() => {
                                toast({
                                  title: "Link copied!",
                                  description:
                                    "The link has been copied to your clipboard.",
                                });
                              });
                          }}
                          className="h-8 w-8"
                          aria-label="Share"
                        >
                          <Share className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Action buttons for private view - horizontal row */}
                    {!isPublicView && (
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/apps/${app.uniqueId}/edit`)
                          }
                          className="h-9 px-3"
                          aria-label="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDashboardClick}
                          className="h-9 px-3"
                          aria-label="Dashboard"
                        >
                          <BarChart className="h-4 w-4" />
                        </Button>
                        {app.isPublished && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const publishedUrl = `/@${username || app.name}`;
                              router.push(publishedUrl);
                            }}
                            className="h-9 px-4"
                            aria-label="Published"
                          >
                            <span className="text-base">Published View</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop layout - side by side */}
                <div className="hidden md:flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-3 md:border-4 border-white dark:border-black shadow-sm">
                      {app.logo ? (
                        <img
                          src={app.logo}
                          alt={app.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={cn("w-full h-full flex items-center justify-center text-white font-bold text-3xl lg:text-4xl", getAvatarColor(app.displayName || app.name))}>
                          {getInitial(app.displayName || app.name)}
                        </div>
                      )}
                    </div>
                    <div
                      className={`absolute bottom-1 right-1 md:bottom-1 md:right-1 w-4 h-4 md:w-4 md:h-4 lg:w-5 lg:h-5 rounded-full border-2 border-white dark:border-black ${
                        isPublicView
                          ? "bg-green-500"
                          : app.isPublished
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    ></div>
                  </div>

                  {/* Name and buttons column for desktop */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
                        {app.displayName}
                      </h1>
                      {/* Show share button in public view */}
                      {isPublicView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentUrl = window.location.href;
                            navigator.clipboard
                              .writeText(currentUrl)
                              .then(() => {
                                toast({
                                  title: "Link copied!",
                                  description:
                                    "The link has been copied to your clipboard.",
                                });
                              });
                          }}
                          className="h-8 w-8 md:h-6 md:w-6 p-0 hover:bg-accent transition-colors"
                          aria-label="Share"
                        >
                          <Share className="h-4 w-4 md:h-3 md:w-3" />
                        </Button>
                      )}
                      {/* Display publish status for public view */}
                      {isPublicView && (
                        <Badge
                          variant={app.isPublished ? "default" : "secondary"}
                          className="text-xs md:text-sm px-2 py-1"
                        >
                          {app.isPublished ? "Published" : "Private"}
                        </Badge>
                      )}
                    </div>
                    {/* Display @username under displayName for public view */}
                    {isPublicView && username && (
                      <p className="text-sm md:text-base text-muted-foreground mb-2">
                        @{username}
                      </p>
                    )}
                    {/* Edit, Dashboard and Publish View buttons in private mode - separate row */}
                    {!isPublicView && (
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/apps/${app.uniqueId}/edit`)
                          }
                          className="h-9 md:h-8 px-3 md:px-3 hover:bg-accent transition-colors flex items-center gap-2"
                          aria-label="Edit Personal AI"
                        >
                          <Edit className="h-4 w-4 md:h-3 md:w-3" />
                          <span className="text-base">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDashboardClick}
                          className="h-9 md:h-8 px-3 md:px-3 hover:bg-accent transition-colors flex items-center gap-2"
                          aria-label="View Dashboard"
                        >
                          <BarChart className="h-4 w-4 md:h-3 md:w-3" />
                          <span className="text-base">Dashboard</span>
                        </Button>
                        {app.isPublished && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const publishedUrl = `/@${username || app.name}`;
                              router.push(publishedUrl);
                            }}
                            className="h-9 md:h-8 px-3 md:px-3 hover:bg-accent transition-colors flex items-center gap-1"
                            aria-label="View Published Version"
                          >
                            <span className="text-base">Publish View</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description on separate row */}
              <div className="w-full mt-2 md:mt-3">
                <TruncatedDescription
                  description={app.description}
                  displayName={app.displayName}
                  lines={2}
                />
              </div>

              {/* Create your own digital clone button */}
              {isPublicView &&
                status === "authenticated" &&
                !user?.app?.isMe && (
                  <div className="mt-4 md:mt-6 p-3 md:p-4 bg-muted/50 rounded-lg border">
                    <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-xs md:text-sm font-semibold mb-1">
                          Create your own AI digital twin - Free!
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Start with one social connection and one link. Upgrade
                          anytime for unlimited sources.
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push("/apps/new?me=true")}
                        variant="default"
                        size="sm"
                      >
                        Create your digital twin →
                      </Button>
                    </div>
                  </div>
                )}

              {/* Sign in prompt for unauthenticated users */}
              {isPublicView && status === "unauthenticated" && (
                <div className="mt-4 md:mt-6 p-3 md:p-4 bg-muted/50 rounded-lg border">
                  <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-xs md:text-sm font-semibold mb-1">
                        Create your own AI digital clone - Free!
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Sign in to start building your digital clone with one
                        social connection and link for free
                      </p>
                    </div>
                    <Button
                      onClick={() => setSignInDialog(true)}
                      variant="outline"
                      size="sm"
                    >
                      Sign in to get started →
                    </Button>
                  </div>
                </div>
              )}

              <Separator className="my-4 md:my-6" />

              {/* Connected sources */}
              <div className="w-full mb-6 md:mb-8 not-prose">
                <h3 className="text-base md:text-lg font-medium text-muted-foreground mb-3 md:mb-4">
                  Connected sources
                </h3>

                {/* Social Media Sources */}
                {(isPublicView
                  ? app?.socialSources
                  : user?.app?.socialSources) &&
                  (isPublicView ? app.socialSources : user?.app?.socialSources)!
                    .length > 0 && (
                    <div className="mb-6">
                      {/* Always show content details with external link option */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                        {(isPublicView
                          ? app.socialSources!
                          : user?.app?.socialSources!
                        ).map((source, i) => {
                          const colors = getSocialNetworkColors(source.type);
                          return (
                            <div key={i} className="w-full">
                              <Badge
                                variant="outline"
                                className="flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 transition-colors cursor-pointer w-full justify-between relative group min-h-[3rem] md:min-h-[3.5rem]"
                                style={{
                                  backgroundColor: colors.backgroundColor,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    colors.hoverBackgroundColor;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    colors.backgroundColor;
                                }}
                                onClick={() => {
                                  setSelectedSource({
                                    type: source.type,
                                    username: source.username,
                                  });
                                }}
                              >
                                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                                  <img
                                    src={`/icons/${source.type.toLowerCase()}.svg`}
                                    alt={source.type}
                                    className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 dark:invert"
                                  />
                                  <div className="flex flex-col items-start min-w-0 flex-1">
                                    <span className="text-xs md:text-sm font-medium text-foreground">
                                      {getSocialNetworkDisplayName(source.type)}
                                    </span>
                                    <span className="text-xs md:text-sm text-muted-foreground truncate w-full">
                                      @{source.username}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 md:h-6 md:w-6 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = getSocialMediaUrl(
                                      source.type,
                                      source.username
                                    );
                                    window.open(
                                      url,
                                      "_blank",
                                      "noopener,noreferrer"
                                    );
                                  }}
                                  aria-label={`Open ${getSocialNetworkDisplayName(
                                    source.type
                                  )} profile`}
                                >
                                  <ArrowRight className="h-3 w-3 md:h-3 md:w-3" />
                                </Button>
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Web Links - Only show heading and content if there are links */}
                {appLinks && appLinks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base md:text-lg font-medium text-muted-foreground mb-3 md:mb-4">
                      Web Links
                    </h3>
                    <LinkSource
                      links={appLinks.map((appLink) => ({
                        link: appLink.link,
                        metadata: appLink.metadata,
                      }))}
                    />
                  </div>
                )}

                {!(isPublicView ? app?.socialSources : user?.app?.socialSources)
                  ?.length &&
                  !appLinks?.length && (
                    <Badge
                      variant="outline"
                      className="text-xs md:text-sm px-3 py-2 text-muted-foreground hover:bg-accent transition-colors"
                    >
                      No sources connected yet
                    </Badge>
                  )}
              </div>

              {/* Suggested questions */}
              <DigitalCloneSuggestedQuestions
                displayName={app.displayName}
                questions={suggestedQuestions}
                isLoading={isLoadingQuestions}
                onQuestionClick={(question) => {
                  emitter.emit(EventTypes.SET_EDITOR_CONTENT, question);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed chat input at bottom - following ChatApp pattern */}
      <div
        className={`fixed left-0 ${
          status === "authenticated"
            ? "bottom-2"
            : "bottom-0 md:bottom-2"
        } bg-background w-full items-center justify-center`}
      >
        <div
          ref={formRef}
          id="chat-editor"
          className="flex flex-col max-w-2xl md:max-w-3xl mx-auto px-4"
        >
          {!isPublicView &&
            user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS && (
              <div className="h-12 md:h-12 border px-4 md:px-3 pb-3 md:pb-3 bg-muted rounded-t-lg space-x-2 flex items-center justify-between">
                <div className="text-sm md:text-sm truncate flex-1">
                  Unlock the best models and unlimited features.
                </div>
                <button
                  onClick={() => {
                    router.push("/pricing");
                  }}
                  className="text-orange-500 font-medium text-sm md:text-sm flex-shrink-0"
                >
                  Upgrade Plan
                </button>
              </div>
            )}
          <div className="relative w-full z-[1] bg-background bottom-2">
            {app?.inputSchema?.fields ? (
              <AppForm
                fields={app.inputSchema.fields}
                onSubmit={async (values: Record<string, any>) => {
                  if (status === "unauthenticated") {
                    setSignInDialog(true);
                    return;
                  }

                  // Create the content string (for backwards compatibility)
                  const content = Object.entries(values)
                    .map(([fieldId, value]) => `${fieldId}: ${value}`)
                    .join("\n");

                  await handleChatSubmit(content);
                }}
                className={
                  !isPublicView &&
                  user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                    ? "-mt-px"
                    : "pt-2"
                }
              />
            ) : (
              <ChatEditor
                className={
                  !isPublicView &&
                  user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                    ? "rounded-t-none -mt-px shadow-none"
                    : undefined
                }
                showAnonymous={false}
                autoFocus
                placeholder={`Ask ${app.displayName} a question`}
                onEnter={handleChatSubmit}
                disableDebateToggle={true}
              />
            )}
          </div>

          {/* Powered by MentionAI */}
          {!session && isPublicView && (
            <div className="hidden md:block w-full pb-2 md:pb-3">
              <p className="text-center text-xs text-muted-foreground">
                Powered by MentionAI. Create your own digital twin{" "}
                <Link
                  href="/apps/new?me=true"
                  className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
                >
                  here
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Source Details Sheet */}
      {selectedSource && (
        <SourceDetailsSheet
          appId={
            isPublicView ? app.uniqueId : user?.app?.uniqueId?.toString() ?? ""
          }
          source={selectedSource.type}
          username={selectedSource.username}
          isOpen={!!selectedSource}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSource(null);
            }
          }}
        />
      )}

      {/* Upgrade Dialog for Free Plan Limitations */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        title="Unlock Analytics Dashboard"
        description="Access to advanced analytics is available with the Plus plan. See detailed insights about your digital clone's conversations and interactions."
        features={[
          "View conversation analytics and metrics",
          "Track user engagement patterns",
          "Monitor popular questions and topics",
          "Export conversation data",
        ]}
      />
    </div>
  );
};
