"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarColor, getInitial } from "@/utils/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOfficialApps } from "@/hooks/use-official-apps";
import { useUserApps } from "@/hooks/use-user-apps";
import { usePublishedDigitalClones } from "@/hooks/use-published-digital-clones";
import { App, gengarApi } from "@/services/api";
import { CategorySection } from "@/components/explore/category-section";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { setSignInDialog } from "@/store/app";
import { PersonalAIScreen } from "@/components/shared/personal-ai-screen";
import { useOfficialApp } from "@/hooks/use-digital-clone";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatPage() {
  const { apps: officialApps } = useOfficialApps();
  const { digitalClones } = usePublishedDigitalClones();
  const { data: userApps = [] } = useUserApps();
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const appId = searchParams?.get("app");
  const { data: officialApp } = useOfficialApp(appId || "");
  const { data: user } = useUser();

  // Fetch recent conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: gengarApi.getConversations,
    enabled: status === "authenticated",
  });

  // Get only the 5 most recent conversations
  const recentChats = React.useMemo(() => {
    return (conversations || []).slice(0, 5);
  }, [conversations]);

  // Type cast official apps
  const typedOfficialApps = React.useMemo(() => {
    return (officialApps as App[]) || [];
  }, [officialApps]);

  // Group apps by category
  const categorizedApps = React.useMemo(() => {
    const categories = new Map<string, App[]>();

    typedOfficialApps.forEach((app) => {
      if (app.category) {
        if (!categories.has(app.category)) {
          categories.set(app.category, []);
        }
        categories.get(app.category)!.push(app);
      }
    });

    return categories;
  }, [typedOfficialApps]);

  // Check if app is user owned
  const isUserOwned = React.useCallback(
    (app: App) => userApps.some((userApp) => userApp.uniqueId === app.uniqueId),
    [userApps]
  );

  // Get random apps for "Who to follow"
  const suggestedApps = React.useMemo(() => {
    const allApps = [...typedOfficialApps, ...digitalClones];
    return allApps.sort(() => 0.5 - Math.random()).slice(0, 4);
  }, [typedOfficialApps, digitalClones]);

  const handleAppClick = (app: App) => {
    if (status === "unauthenticated") {
      setSignInDialog(true);
    } else {
      if (app.isMe) {
        // Check if the app belongs to the current user
        if ((app as any).userId === user?.userId) {
          router.push(`/apps/${app.uniqueId}`);
        } else {
          router.push(`/@${app.name}`);
        }
      } else {
        router.push(`/apps/${app.uniqueId}`);
      }
    }
  };

  if (officialApp?.isMe) {
    return (
      <PersonalAIScreen
        app={officialApp}
        isPublicView={false}
        username={officialApp.name}
      />
    );
  }

  return (
    <div className="w-full min-h-screen">
      {/* Content Section */}
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-12 relative">
          {/* Left Column - 1/4 width */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              {/* Who to Follow Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Who to follow</h2>
                <div className="space-y-4">
                  {suggestedApps.map((app) => (
                    <div
                      key={app.uniqueId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 ring-2 ring-transparent hover:ring-brand transition-all duration-200 cursor-pointer">
                          <AvatarImage src={app.logo} alt={app.displayName} />
                          <AvatarFallback className={`text-white font-medium ${getAvatarColor(app.displayName)}`}>{getInitial(app.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium cursor-pointer hover:text-brand transition-colors"
                            onClick={() => handleAppClick(app)}
                          >
                            {app.displayName}
                          </span>
                          {app.isMe && app.name === "Record Club" && (
                            <Badge className="bg-primary text-primary-foreground h-5 px-1.5 text-xs">
                              HQ
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleAppClick(app)}
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Chats Section */}
              {status === "authenticated" && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Recent Chats</h2>
                  {conversationsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex flex-col space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : recentChats.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No conversations yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentChats.map((chat) => (
                        <div
                          key={chat.uniqueId}
                          className="cursor-pointer hover:bg-muted/50 transition-colors duration-200 rounded-lg p-2 -mx-2"
                          onClick={() => router.push(`/c/${chat.uniqueId}`)}
                        >
                          <p className="font-medium text-sm line-clamp-1">
                            {chat.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {chat.isDebate && (
                              <Badge
                                variant="outline"
                                className="bg-orange-400/15 text-orange-500 border-orange-500/30 h-5 px-1.5 text-xs"
                              >
                                Debate
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {chat.createdAt
                                ? dayjs(chat.createdAt).format("MMM D, YYYY")
                                : "unknown"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Right Column - 3/4 width */}
          <div className="lg:col-span-3 space-y-8 md:space-y-12">
            {/* Digital Clones Section */}
            {digitalClones.length > 0 && (
              <CategorySection
                title="Digital Clones"
                apps={digitalClones}
                isUserOwned={isUserOwned}
              />
            )}

            {/* Categories */}
            {Array.from(categorizedApps).map(([category, apps]) => (
              <CategorySection
                key={category}
                title={category}
                apps={apps}
                isUserOwned={isUserOwned}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
