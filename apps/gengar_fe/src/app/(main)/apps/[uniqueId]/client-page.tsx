"use client";

import { useChat } from "@/hooks/use-chat";
import { ChatEditor } from "@/components/chat-editor";
import { ChatApp } from "@/components/chat";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { useChatStore } from "@/store/chat";
import { BACKEND_URL } from "@/utils/constants";
import { EventTypes, useEventListener } from "@/services/event-emitter";
import { setSignInDialog } from "@/store/app";
import { AppForm } from "@/components/app-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useOfficialApp } from "@/hooks/use-digital-clone";
import { PersonalAIScreen } from "@/components/shared/personal-ai-screen";
import { useUser } from "@/hooks/use-user";
import { useOfficialApps } from "@/hooks/use-official-apps";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, ArrowRight } from "lucide-react";
import { TruncatedDescription } from "@/components/shared/truncated-description";

interface AppDetailClientPageProps {
  uniqueId: string;
}

export default function AppDetailClientPage({
  uniqueId,
}: AppDetailClientPageProps) {
  const id = uuidv4();
  const idRef = useRef(id);
  const { data: session, status } = useSession();
  const isAnonymous = useChatStore((state) => state.isAnonymous);
  const isDebateMode = useChatStore((state) => state.isDebateMode);
  const isWebSearchEnabled = useChatStore((state) => state.isWebSearchEnabled);
  const router = useRouter();
  const { data: user } = useUser();

  // Use React Query hook to fetch app details
  const {
    data: app,
    isLoading: loading,
    error: queryError,
  } = useOfficialApp(uniqueId);

  // Fetch all apps to show related apps
  const { apps: allApps } = useOfficialApps();

  // Add refs for dynamic padding
  const formRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  useEventListener(EventTypes.NEW_CHAT, () => {
    idRef.current = uuidv4();
    setMessages([]);
  });

  // Add dynamic padding for fixed input
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

  // If there are messages, show the chat app
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

  const handleChatSubmit = async (content: string, s3Links?: string[]) => {
    if (status === "unauthenticated") {
      setSignInDialog(true);
      return;
    }

    // Optimistic navigation - redirect immediately for non-anonymous users
    if (!isAnonymous && !hasRedirected) {
      setHasRedirected(true);
      const params = new URLSearchParams();
      if (app) {
        params.set("app", app.uniqueId);
      }

      const queryString = params.toString();
      const url = `/c/${idRef.current}${queryString ? `?${queryString}` : ""}`;

      router.replace(url);
    }

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
          isDeepThinkMode: useChatStore.getState().isDeepThinkMode,
          isWebSearchEnabled,
          models: [],
          messageId: uuidv4(),
          app: app?.name,
          inputs: [],
        },
      }
    );
  };

  const handleFormSubmit = async (values: Record<string, any>) => {
    if (status === "unauthenticated") {
      setSignInDialog(true);
      return;
    }

    // Create the content string (for backwards compatibility)
    const content = Object.entries(values)
      .map(([fieldId, value]) => `${fieldId}: ${value}`)
      .join("\n");

    await handleChatSubmit(content);
  };

  // Error state - redirect to 404 page
  if (!loading && (queryError || !app)) {
    notFound();
  }

  // Still loading
  if (loading || !app) {
    return null;
  }

  // If it's a digital clone (isMe), show PersonalAIScreen
  if (app.isMe) {
    return (
      <PersonalAIScreen
        app={app}
        username={(app as any).name}
        isPublicView={false}
      />
    );
  }

  // Get related apps (same category, exclude current app)
  const relatedApps = allApps
    ?.filter(
      (a) =>
        a.category === app.category && a.uniqueId !== app.uniqueId && !a.isMe // Exclude digital clones
    )
    .slice(0, 6); // Show max 6 related apps

  return (
    <div className="flex flex-col w-full h-full overflow-auto">
      <div className="flex flex-col h-full">
        <div className="w-full grow flex flex-col items-center overflow-auto">
          <div className="w-full overflow-hidden">
            <div
              className="relative max-w-4xl w-full mx-auto px-4 md:px-8 py-8 md:py-12"
              ref={chatContainerRef}
            >
              {/* App Header */}
              <div className="flex flex-col items-center text-center mb-12">
                {/* App Logo */}
                <div className="relative w-24 h-24 md:w-32 md:h-32 mb-6">
                  <Image
                    src={app.logo}
                    alt={app.displayName}
                    fill
                    className="object-cover rounded-2xl"
                  />
                </div>

                {/* App Name & Category */}
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {app.displayName}
                </h1>
                {app.category && (
                  <Badge variant="secondary" className="mb-4">
                    {app.category}
                  </Badge>
                )}

                {/* Description */}
                {app.description && (
                  <p className="text-lg text-muted-foreground max-w-2xl">
                    {app.description}
                  </p>
                )}

                {/* Usage Stats */}
                <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="size-4" />
                    <span>AI-Powered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="size-4" />
                    <span>Instant response</span>
                  </div>
                </div>
              </div>

              <Separator className="mb-12" />

              {/* App Description */}
              {app.instruction && (
                <div className="mb-12">
                  <h2 className="text-xl font-semibold mb-4">Description</h2>
                  <TruncatedDescription
                    description={app.instruction}
                    displayName={app.displayName}
                    lines={3}
                  />
                </div>
              )}

              {/* Related Apps Section */}
              {relatedApps && relatedApps.length > 0 && (
                <div className="mt-16">
                  <h2 className="text-xl font-semibold mb-6">
                    Related Apps in {app.category}
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {relatedApps.map((relatedApp) => (
                      <div
                        key={relatedApp.uniqueId}
                        className="flex flex-col items-center space-y-2 group cursor-pointer"
                        onClick={() =>
                          router.push(`/apps/${relatedApp.uniqueId}`)
                        }
                      >
                        {/* Circular App Image */}
                        <div className="relative w-16 h-16 md:w-20 md:h-20 overflow-hidden rounded-full bg-muted ring-2 ring-transparent group-hover:ring-brand transition-all duration-300">
                          <Image
                            src={relatedApp.logo}
                            alt={relatedApp.displayName}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                        </div>

                        {/* App Name */}
                        <div className="text-center space-y-1">
                          <h3 className="text-xs md:text-sm font-medium line-clamp-2 group-hover:text-brand transition-colors">
                            {relatedApp.displayName}
                          </h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed chat input at bottom */}
      <div className="fixed left-0 bottom-2 bg-background w-full items-center justify-center">
        <div
          ref={formRef}
          id="chat-editor"
          className="flex flex-col max-w-2xl md:max-w-3xl mx-auto px-4 md:px-4"
        >
          <div className="relative w-full z-[1] bg-background bottom-2">
            {app?.inputSchema?.fields ? (
              <AppForm
                fields={app.inputSchema.fields}
                onSubmit={handleFormSubmit}
                className="pt-2"
              />
            ) : (
              <ChatEditor
                showAnonymous={false}
                autoFocus
                placeholder={`Ask ${app.displayName} anything...`}
                onEnter={handleChatSubmit}
                disableDebateToggle={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
