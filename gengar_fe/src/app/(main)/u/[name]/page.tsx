"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePublishedApp } from "@/hooks/use-digital-clone";

interface PublishedApp {
  id: number;
  name: string;
  uniqueId: string;
  displayName: string;
  logo: string;
  description: string | null;
  instruction: string;
  isPublished: boolean;
  appLinks?: Array<{
    id: number;
    link: string;
    createdAt: Date;
  }>;
  socialSources?: Array<{
    id: number;
    type: string;
    username: string;
    createdAt: Date;
  }>;
  createdAt: Date;
}

export default function PublicClonePage() {
  const params = useParams();
  const name = params?.name as string;

  // Use React Query hook for caching
  const {
    data: app,
    isLoading: loading,
    error: queryError,
  } = usePublishedApp(name || "");

  // Derive error message from query error
  const error = queryError
    ? (queryError as any)?.response?.status === 404
      ? "Digital clone not found or not published"
      : "Failed to load digital clone"
    : null;

  if (!loading && (error || !app)) {
    notFound();
  }

  if (loading || !app) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header Section */}
      <div className="flex items-start space-x-6 mb-8">
        <Avatar className="h-20 w-20">
          <AvatarImage src={app.logo} alt={app.displayName} />
          <AvatarFallback>
            {app.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h1 className="text-3xl font-bold">{app.displayName}</h1>
            <Badge variant="secondary">@{app.name}</Badge>
          </div>
          {app.description && (
            <p className="text-muted-foreground text-lg mb-4">
              {app.description}
            </p>
          )}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Digital Clone</span>
            <span>•</span>
            <span>Public</span>
            {app.createdAt && (
              <>
                <span>•</span>
                <span>Created {new Date(app.createdAt).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Chat with {app.displayName}</CardTitle>
              <CardDescription>
                Start a conversation with this digital clone
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chat interface will be implemented here */}
              <div className="bg-muted/30 rounded-lg p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Chat interface coming soon...
                </p>
                <p className="text-sm text-muted-foreground">
                  This will allow you to chat with {app.displayName}&apos;s
                  digital clone
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Connected Sources */}
          {app.socialSources && app.socialSources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connected Sources</CardTitle>
                <CardDescription>
                  Data sources used to train this digital clone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {app.socialSources.map((source) => (
                  <div key={source.id} className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {source.type.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">
                        {source.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{source.username}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Additional Links */}
          {app.appLinks && app.appLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Sources</CardTitle>
                <CardDescription>External content sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {app.appLinks.map((link) => (
                  <div key={link.id}>
                    <a
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline block truncate"
                    >
                      {new URL(link.link).hostname}
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is a public digital clone. You can chat with it to learn
                about {app.displayName}&apos;s thoughts, experiences, and
                knowledge based on their connected data sources.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
