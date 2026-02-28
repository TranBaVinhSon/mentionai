"use client";

import { useState } from "react";
import { usePublishedAppTimeline } from "@/hooks/use-published-app-timeline";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Image from "next/image";

const SOURCE_ICONS: Record<string, string> = {
  facebook: "/icons/facebook.svg",
  threads: "/icons/threads.svg",
  twitter: "/icons/twitter.svg",
  instagram: "/icons/instagram.svg",
  linkedin: "/icons/linkedin.svg",
  reddit: "/icons/reddit.svg",
  medium: "/icons/medium.svg",
  github: "/icons/github.svg",
  producthunt: "/icons/producthunt.svg",
  substack: "/icons/substack.svg",
  goodreads: "/icons/goodreads.svg",
};

const SOURCE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  threads: "Threads",
  twitter: "Twitter / X",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  reddit: "Reddit",
  medium: "Medium",
  github: "GitHub",
  producthunt: "Product Hunt",
  substack: "Substack",
  goodreads: "Goodreads",
};

interface TimelineTabProps {
  appName: string;
  availableSources?: Array<{ type: string }>;
}

export function TimelineTab({ appName, availableSources }: TimelineTabProps) {
  const [sourceFilter, setSourceFilter] = useState<string | undefined>(
    undefined
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    usePublishedAppTimeline(appName, sourceFilter);

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  // Filter out gmail from available sources
  const filteredSources = availableSources?.filter(
    (s) => s.type.toLowerCase() !== "gmail"
  );

  const formatDate = (dateStr: string | null, fallback: string) => {
    const date = dateStr || fallback;
    if (!date) return "";
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Source filter bar */}
      {filteredSources && filteredSources.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!sourceFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter(undefined)}
          >
            All
          </Button>
          {filteredSources.map((source) => (
            <Button
              key={source.type}
              variant={
                sourceFilter === source.type.toLowerCase()
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                setSourceFilter(
                  sourceFilter === source.type.toLowerCase()
                    ? undefined
                    : source.type.toLowerCase()
                )
              }
              className="gap-1.5"
            >
              {SOURCE_ICONS[source.type.toLowerCase()] && (
                <Image
                  src={SOURCE_ICONS[source.type.toLowerCase()]}
                  alt={source.type}
                  width={14}
                  height={14}
                  className="dark:invert"
                />
              )}
              {SOURCE_LABELS[source.type.toLowerCase()] || source.type}
            </Button>
          ))}
        </div>
      )}

      {/* Timeline items */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No timeline content available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {SOURCE_ICONS[item.source] && (
                  <Image
                    src={SOURCE_ICONS[item.source]}
                    alt={item.source}
                    width={14}
                    height={14}
                    className="dark:invert"
                  />
                )}
                <span className="font-medium">
                  {SOURCE_LABELS[item.source] || item.source}
                </span>
                <span>·</span>
                <span>
                  {formatDate(
                    item.socialContentCreatedAt,
                    item.createdAt
                  )}
                </span>
                <span className="capitalize text-muted-foreground/60">
                  {item.type}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {item.content}
              </p>
              {item.metadata?.description && item.type === "repository" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.metadata.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
