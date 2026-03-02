"use client";

import { useChat } from "@/hooks/use-chat";
import { ChatEditor } from "@/components/chat-editor";

import { Chat, ChatApp } from "@/components/chat";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { notFound } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  extractTextModelsFromRequest,
  extractAppIdsFromRequest,
} from "@/lib/utils";
import { Examples } from "@/components/home/examples";
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
import { usePublishedApp } from "@/hooks/use-digital-clone";
import { BACKEND_URL } from "@/utils/constants";
import { EventTypes, useEventListener } from "@/services/event-emitter";
import Link from "next/link";
import {
  XIcon,
  Bot,
  Users,
  MessageSquare,
  Cpu,
  CheckIcon,
  Edit,
  Loader2,
} from "lucide-react";
import { useModels } from "@/hooks/use-models";
import { setSignInDialog } from "@/store/app";
import { AppForm } from "@/components/app-form";
import { MyTooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { Info as InformationCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ModelLogo from "@/components/shared/model-logo";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { SourceDetailsSheet } from "@/components/source-details-sheet";
import { SocialNetworkType } from "@/services/api";
import { SocialSourcesContent } from "@/components/social-sources-content";
import { LinkSource } from "@/components/shared/link-source";
import { Separator } from "@/components/ui/separator";
import { PersonalAIScreen } from "@/components/shared/personal-ai-screen";
import { trackAppPageView } from "@/utils/analytics";
import { usePostHog } from "posthog-js/react";

// Extend the App type to include isMe property
interface MeApp extends App {
  isMe?: boolean;
  links?: string[];
  isPublished?: boolean;
  userId?: number;
}

interface UsernameClientPageProps {
  username: string;
}

export default function UsernameClientPage({
  username,
}: UsernameClientPageProps) {
  const placeholder = "Ask anything! @mention to access AI models and apps";
  const path = usePathname();
  const id = uuidv4();
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
  const posthog = usePostHog();

  // Decode URL encoding first, then remove @ symbol if present
  const decodedUsername = username ? decodeURIComponent(username) : "";
  const cleanUsername = decodedUsername?.startsWith("@")
    ? decodedUsername.slice(1)
    : decodedUsername;

  // Use React Query hook for fetching published app
  const {
    data: publishedApp,
    isLoading: loading,
    error: queryError,
  } = usePublishedApp(cleanUsername);

  // Transform the app data to include isMe flag
  const app: MeApp | null = useMemo(() => {
    return publishedApp
      ? {
          ...publishedApp,
          isMe: true,
        }
      : null;
  }, [publishedApp]);

  // Derive error message from query error
  const error = queryError
    ? (queryError as any)?.response?.status === 404
      ? "Digital clone not found or not published"
      : "Failed to load digital clone"
    : null;

  // Add refs for dynamic padding like Chat component
  const formRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pageLoadId = useRef(Date.now().toString());
  const hasTrackedRef = useRef<string | null>(null);

  const handleRemoveApp = () => {
    const newParams = new URLSearchParams(searchParams || "");
    newParams.delete("app");
    router.push(`/@${cleanUsername}?${newParams.toString()}`);
  };

  const [hasRedirected, setHasRedirected] = useState(false);

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

  // Handle model selection and editor placeholder
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
      // Set placeholder based on app data
      if (app) {
        setEditorPlaceholder(`Ask ${app.displayName} a question`);
      } else {
        setEditorPlaceholder(placeholder);
      }
    }
  }, [searchParams, models, app, placeholder]);

  // Handle PostHog tracking when app data is loaded
  useEffect(() => {
    if (app && posthog) {
      // Track page view with PostHog (prevent duplicate calls in React Strict Mode)
      const trackingKey = `${app.uniqueId}-${pageLoadId.current}`;
      if (hasTrackedRef.current !== trackingKey) {
        hasTrackedRef.current = trackingKey;

        // Track digital clone view event - PostHog will automatically add geographic data via GeoIP
        posthog.capture("digital_clone_viewed", {
          clone_id: app.uniqueId,
          clone_name: app.name,
          clone_username: cleanUsername,
          clone_display_name: app.displayName,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [app, posthog, cleanUsername]);

  useEventListener(EventTypes.NEW_CHAT, () => {
    idRef.current = uuidv4();
    setMessages([]);
  });

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

  // If there are messages, we want to show the chat app
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

  const handleFormSubmit = async (values: Record<string, any>) => {
    if (status === "unauthenticated") {
      setSignInDialog(true);
      return;
    }

    const content = Object.entries(values)
      .map(([fieldId, value]) => `${fieldId}: ${value}`)
      .join("\n");

    let models: string[] = [];
    if (model) {
      models = [model.name];
    }

    if (!isAnonymous && !hasRedirected) {
      setHasRedirected(true);
      const params = new URLSearchParams();
      if (app) {
        params.set("app", app.uniqueId);
      }

      if (app?.userId !== user?.userId) {
        params.set("userId", app?.userId?.toString() || "");
      }

      const queryString = params.toString();
      const url = `/c/${idRef.current}${queryString ? `?${queryString}` : ""}`;

      console.log("[Username] Redirecting to:", url);
      router.replace(url);
    }

    // Append the message
    const appendBody = {
      newUniqueId: idRef.current,
      isAnonymous,
      isDebateMode: useChatStore.getState().isDebateMode,
      isDeepThinkMode: useChatStore.getState().isDeepThinkMode,
      models,
      messageId: uuidv4(),
      app: app?.name,
      isMe: app?.isMe,
    };

    console.log("[Username] Calling append with:", {
      body: appendBody,
      api: `${BACKEND_URL}/internal/api/v1/completions`,
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
  };

  // Error state - redirect to 404 page
  if (!loading && (error || !app)) {
    notFound();
  }

  // Still loading
  if (loading || !app) {
    return null;
  }

  // Me Mode Personal AI UI (using shared component)
  if (app?.isMe) {
    return (
      <PersonalAIScreen
        app={app}
        username={cleanUsername}
        isPublicView={true}
      />
    );
  }

  // Fallback (shouldn't reach here with current logic)
  return null;
}
