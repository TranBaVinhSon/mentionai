"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useOfficialApps } from "@/hooks/use-official-apps";
import { useUserApps } from "@/hooks/use-user-apps";
import { usePublishedDigitalClones } from "@/hooks/use-published-digital-clones";
import { App } from "@/services/api";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { setSignInDialog } from "@/store/app";
import Image from "next/image";
import { Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";

export default function AppStorePage() {
  const { data: user } = useUser();

  // Add custom styles to hide scrollbar
  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .scrollbar-none::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-none {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const { apps: officialApps, isLoading: isOfficialAppsLoading } =
    useOfficialApps();
  const { digitalClones, isLoading: isDigitalClonesLoading } =
    usePublishedDigitalClones();
  const { data: userApps = [], isLoading: isUserAppsLoading } = useUserApps();
  const router = useRouter();
  const { status } = useSession();
  const [activeTab, setActiveTab] = React.useState("all");

  // State for category filters - only enable first 4 by default
  const [categoryFilters, setCategoryFilters] = React.useState<
    Record<string, boolean>
  >(() => {
    const filters: Record<string, boolean> = {
      "digital-clones": true,
    };
    return filters;
  });

  // Type cast official apps
  const typedOfficialApps = React.useMemo(() => {
    return (officialApps as App[]) || [];
  }, [officialApps]);

  // Get all unique categories
  const categories = React.useMemo(() => {
    const categorySet = new Set<string>();
    typedOfficialApps.forEach((app) => {
      if (app.category) {
        categorySet.add(app.category);
      }
    });
    return Array.from(categorySet).sort();
  }, [typedOfficialApps]);

  // Initialize category filters when categories change - only first 3 categories enabled
  React.useEffect(() => {
    setCategoryFilters((prev) => {
      const newFilters = { ...prev };
      categories.forEach((category, index) => {
        if (!(category in newFilters)) {
          // Only enable first 3 categories (plus digital-clones makes 4 total)
          newFilters[category] = index < 3;
        }
      });
      return newFilters;
    });
  }, [categories]);

  // Get visible categories based on filters
  const visibleCategories = React.useMemo(() => {
    return categories.filter((category) => categoryFilters[category] !== false);
  }, [categories, categoryFilters]);

  // Reset to "all" tab if current tab is hidden
  React.useEffect(() => {
    if (
      activeTab !== "all" &&
      activeTab !== "digital-clones" &&
      !categoryFilters[activeTab]
    ) {
      setActiveTab("all");
    } else if (
      activeTab === "digital-clones" &&
      !categoryFilters["digital-clones"]
    ) {
      setActiveTab("all");
    }
  }, [activeTab, categoryFilters]);

  // Group apps by category
  const categorizedApps = React.useMemo(() => {
    const categoryMap = new Map<string, App[]>();

    // Create a set of digital clone uniqueIds to avoid duplication
    const digitalCloneIds = new Set(digitalClones.map((app) => app.uniqueId));

    // Filter out any digital clones that might be in typedOfficialApps to prevent duplication
    const filteredOfficialApps = typedOfficialApps.filter(
      (app) => !digitalCloneIds.has(app.uniqueId)
    );

    // Add all apps to "all" category - digital clones first, then filtered official apps
    categoryMap.set("all", [...digitalClones, ...filteredOfficialApps]);

    // Add digital clones category
    categoryMap.set("digital-clones", digitalClones);

    // Add individual categories using filtered official apps
    filteredOfficialApps.forEach((app) => {
      if (app.category) {
        if (!categoryMap.has(app.category)) {
          categoryMap.set(app.category, []);
        }
        categoryMap.get(app.category)!.push(app);
      }
    });

    return categoryMap;
  }, [
    typedOfficialApps,
    digitalClones,
    isDigitalClonesLoading,
    isOfficialAppsLoading,
  ]);

  // Format count for display
  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  // Check if app is user owned - should only apply to user's created apps, not digital clones from others
  const isUserOwned = React.useCallback(
    (app: App) => {
      // Digital clones (isMe: true) should only show "Your App" if they belong to current user
      if (app.isMe) {
        return (app as any).userId === user?.userId;
      }
      // For regular apps, check if they exist in user's apps
      return userApps.some((userApp) => userApp.uniqueId === app.uniqueId);
    },
    [userApps, user?.userId]
  );

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

  const renderAppGrid = (apps: App[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {apps.map((app) => (
        <div
          key={app.uniqueId}
          className="group cursor-pointer"
          onClick={() => handleAppClick(app)}
        >
          <div className="space-y-2">
            {/* App Image */}
            <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
              <Image
                src={app.logo}
                alt={app.displayName}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>

            {/* App Info */}
            <div className="space-y-1 px-1">
              <h3 className="text-sm font-medium line-clamp-1 group-hover:text-brand transition-colors">
                {app.displayName}
              </h3>
              {app.isMe ? (
                <p className="text-xs text-muted-foreground group-hover:text-brand/70 transition-colors">
                  @{app.name}
                </p>
              ) : (
                app.category && (
                  <p className="text-xs text-muted-foreground">
                    {app.category}
                  </p>
                )
              )}
              {isUserOwned(app) && (
                <Badge variant="secondary" className="text-xs h-5">
                  Your App
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Show loading if data is still being fetched
  if (isDigitalClonesLoading || isOfficialAppsLoading) {
    return (
      <div className="w-full min-h-screen">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl md:text-3xl font-bold">
              Explore all digital clones
            </h1>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold">
            Explore all digital clones
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tabs List with Settings */}
          <div className="flex items-center justify-between gap-3 mb-8 overflow-hidden">
            <TabsList className="flex items-center justify-start gap-1 bg-transparent p-0 overflow-x-auto overflow-y-hidden scrollbar-none flex-1">
              <TabsTrigger
                value="all"
                className="bg-muted text-muted-foreground hover:text-brand data-[state=active]:bg-muted data-[state=active]:text-brand transition-colors px-6 py-2.5 rounded-md font-medium whitespace-nowrap flex-shrink-0"
              >
                All{" "}
                <span className="ml-2 text-sm font-normal opacity-60">
                  {formatCount((categorizedApps.get("all") || []).length)}
                </span>
              </TabsTrigger>
              {categoryFilters["digital-clones"] && (
                <TabsTrigger
                  value="digital-clones"
                  className="bg-muted text-muted-foreground hover:text-brand data-[state=active]:bg-muted data-[state=active]:text-brand transition-colors px-6 py-2.5 rounded-md font-medium whitespace-nowrap flex-shrink-0"
                >
                  Digital Twins{" "}
                  <span className="ml-2 text-sm font-normal opacity-60">
                    {formatCount(digitalClones.length)}
                  </span>
                </TabsTrigger>
              )}
              {visibleCategories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="bg-muted text-muted-foreground hover:text-brand data-[state=active]:bg-muted data-[state=active]:text-brand transition-colors px-6 py-2.5 rounded-md font-medium capitalize whitespace-nowrap flex-shrink-0"
                >
                  {category}{" "}
                  <span className="ml-2 text-sm font-normal opacity-60">
                    {formatCount((categorizedApps.get(category) || []).length)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 flex-shrink-0"
                >
                  <Settings size={24} />
                  <span className="sr-only">Filter settings</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-base font-semibold">
                  Included categories
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="space-y-3 p-3">
                  {/* Digital Clones Toggle */}
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="digital-clones-toggle"
                      className={`text-sm font-medium cursor-pointer transition-colors ${
                        categoryFilters["digital-clones"]
                          ? "text-brand"
                          : "text-foreground"
                      }`}
                    >
                      Digital Clones
                    </label>
                    <Switch
                      id="digital-clones-toggle"
                      checked={categoryFilters["digital-clones"] ?? true}
                      onCheckedChange={(checked) =>
                        setCategoryFilters((prev) => ({
                          ...prev,
                          "digital-clones": checked,
                        }))
                      }
                    />
                  </div>

                  {/* Category Toggles */}
                  {categories.map((category) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <label
                        htmlFor={`${category}-toggle`}
                        className={`text-sm font-medium cursor-pointer capitalize transition-colors ${
                          categoryFilters[category]
                            ? "text-brand"
                            : "text-foreground"
                        }`}
                      >
                        {category}
                      </label>
                      <Switch
                        id={`${category}-toggle`}
                        checked={categoryFilters[category] ?? false}
                        onCheckedChange={(checked) =>
                          setCategoryFilters((prev) => ({
                            ...prev,
                            [category]: checked,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tab Content */}
          <TabsContent value="all" className="mt-0">
            {renderAppGrid(categorizedApps.get("all") || [])}
          </TabsContent>

          <TabsContent value="digital-clones" className="mt-0">
            {digitalClones.length > 0 ? (
              renderAppGrid(digitalClones)
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No digital clones available
                </p>
              </div>
            )}
          </TabsContent>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="mt-0">
              {renderAppGrid(categorizedApps.get(category) || [])}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
