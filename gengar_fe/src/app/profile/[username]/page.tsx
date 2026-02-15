"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useSession } from "next-auth/react";
import { App, SocialNetworkType } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@/hooks/use-chat";
import { ChatEditor } from "@/components/chat-editor";
import { Chat } from "@/components/chat";
import { v4 as uuidv4 } from "uuid";
import { BACKEND_URL } from "@/utils/constants";
import { setSignInDialog } from "@/store/app";
import { useChatStore } from "@/store/chat";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Globe,
  User,
  ExternalLink,
  Loader2,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { usePublishedApp } from "@/hooks/use-digital-clone";

interface PublishedAppPageProps {}

export default function PublishedAppPage({}: PublishedAppPageProps) {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [chatId] = useState(() => uuidv4());
  const [isChatting, setIsChatting] = useState(false);
  const isAnonymous = useChatStore((state) => state.isAnonymous);
  const isWebSearchEnabled = useChatStore((state) => state.isWebSearchEnabled);

  const {
    messages,
    append,
    isLoading: chatLoading,
  } = useChat({
    api: `${BACKEND_URL}/internal/api/v1/completions`,
    streamProtocol: "text",
    id: chatId,
    onResponse() {
      if (!isChatting) {
        setIsChatting(true);
      }
    },
  });

  const username = Array.isArray(params?.username)
    ? params?.username[0]
    : params?.username;
  // Remove @ symbol if present
  const cleanUsername = username?.startsWith("@")
    ? username.slice(1)
    : username;

  // Use React Query hook for caching
  const {
    data: app,
    isLoading: loading,
    error: queryError,
  } = usePublishedApp(cleanUsername || "");

  // Derive error message from query error
  const error = queryError
    ? (queryError as any)?.response?.status === 404
      ? "Digital clone not found or not published"
      : "Failed to load digital clone"
    : null;

  const handleStartChat = () => {
    if (status === "unauthenticated") {
      toast({
        title: "Login Required",
        description: "Please log in to chat with this digital clone",
        variant: "default",
      });
      setSignInDialog(true);
      return;
    }
    setIsChatting(true);
  };

  const handleSendMessage = async (content: string) => {
    if (!app) return;

    if (status === "unauthenticated") {
      toast({
        title: "Login Required",
        description: "Please log in to chat with this digital clone",
        variant: "default",
      });
      setSignInDialog(true);
      return;
    }

    try {
      await append(
        {
          id: uuidv4(),
          role: "user",
          content,
        },
        {
          body: {
            newUniqueId: chatId,
            isAnonymous: false,
            isDebateMode: false,
            isDeepThinkMode: useChatStore.getState().isDeepThinkMode,
            isWebSearchEnabled: false,
            models: [],
            messageId: uuidv4(),
            app: app.name,
            inputs: [],
          },
        }
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!loading && (error || !app)) {
    notFound();
  }

  if (loading || !app) {
    return null;
  }

  if (isChatting && messages.length > 0) {
    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatting(false)}
              >
                ← Back to Profile
              </Button>
              <div className="flex items-center space-x-3">
                {app.logo && (
                  <img
                    src={app.logo}
                    alt={app.displayName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                )}
                <div>
                  <h1 className="font-semibold">{app.displayName}</h1>
                  <p className="text-sm text-muted-foreground">
                    @{cleanUsername}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <Chat
            id={chatId}
            isAnonymous={isAnonymous}
            isWebSearchEnabled={isWebSearchEnabled}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {app.logo ? (
              <img
                src={app.logo}
                alt={app.displayName}
                className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {app.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {app.displayName}
          </h1>
          <p className="text-xl text-muted-foreground mb-4">@{cleanUsername}</p>
          {app.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {app.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            size="lg"
            onClick={handleStartChat}
            className="flex items-center gap-2"
          >
            {status === "unauthenticated" ? (
              <>
                <LogIn className="h-5 w-5" />
                Login to Chat
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5" />
                Start Conversation
              </>
            )}
          </Button>
        </div>

        {/* Chat Input (when not in full chat mode) */}
        {!isChatting && (
          <div className="mb-8">
            <Card>
              <CardContent className="p-6">
                <ChatEditor
                  placeholder={
                    status === "unauthenticated"
                      ? "Login to start chatting with this digital clone..."
                      : `Start a conversation with ${app.displayName}...`
                  }
                  onEnter={handleSendMessage}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Connected Sources */}
        <div className="space-y-6">
          {/* Social Media Sources */}
          {app.socialSources && app.socialSources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Connected Social Media
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {app.socialSources.map((source, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {source.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">
                          {source.type.toLowerCase()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{source.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Website Links */}
          {app.appLinks && app.appLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Connected Websites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {app.appLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Link
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline truncate block"
                        >
                          {link.link}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Capabilities */}
          {app.capabilities && app.capabilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {app.capabilities.map((capability, index) => (
                    <Badge key={index} variant="secondary">
                      {capability === "webSearch" && "Web Search"}
                      {capability === "imageGeneration" && "Image Generation"}
                      {capability !== "webSearch" &&
                        capability !== "imageGeneration" &&
                        capability}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Powered by{" "}
            <Link href="/" className="text-primary hover:underline">
              MentionAI
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
