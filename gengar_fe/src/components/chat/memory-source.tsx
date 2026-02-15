import {
  Book as Book02Icon,
  Brain as Brain02Icon,
  Brain as Brain01Icon,
  Link as LinkIcon,
} from "lucide-react";
import { MyTooltip } from "../ui/tooltip";
import useScreenSize from "@/hooks/use-screen";
import { MemorySource as MemorySourceType } from "./chat-message";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";

const getSourceIcon = (source: string, link?: string) => {
  const sourceMap: { [key: string]: string } = {
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
    link: `https://www.google.com/s2/favicons?domain=${link}`,
  };

  const sourceLower = source.toLowerCase();
  return sourceMap[sourceLower] || "/icons/default.svg";
};

const isMemorySource = (source: string) => {
  const memorySources = [
    "memory",
    "conversation",
    "temporal",
    "behavioral",
    "mem0",
  ];
  return memorySources.includes(source.toLowerCase());
};

const getSourceDisplayName = (source: string) => {
  const displayNames: { [key: string]: string } = {
    facebook: "Facebook",
    threads: "Threads",
    twitter: "Twitter",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    gmail: "Gmail",
    reddit: "Reddit",
    medium: "Medium",
    github: "GitHub",
    producthunt: "ProductHunt",
    substack: "Substack",
    memory: "Memory",
    mem0: "Memory",
    database: "Social Content",
    app_link: "Article",
    document: "Article",
    link: "Web Link",
  };

  const sourceLower = source.toLowerCase();
  return displayNames[sourceLower] || source;
};

interface LayerGroup {
  layer: string;
  displayName: string;
  memories: MemorySourceType[];
  color: string;
}

const getLayerColor = (source: string) => {
  const colors: { [key: string]: string } = {
    memory: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    database:
      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    conversation:
      "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
    temporal:
      "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
    behavioral: "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200",
    linkedin: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    producthunt:
      "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
    medium: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    reddit: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    github: "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200",
    substack:
      "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
    app_link:
      "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200",
    document:
      "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200",
    link: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  };

  return (
    colors[source] ||
    "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
  );
};

export function MemorySource({
  memorySources,
  isEnhanced = false,
}: {
  memorySources: MemorySourceType[];
  isEnhanced?: boolean;
}) {
  const { width } = useScreenSize();
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

  // Filter and enhance memory sources to show original content
  const filteredSources = memorySources
    ?.filter((memory) => {
      // Always include items with links or external IDs
      const hasActualLink =
        memory.metadata?.link && memory.metadata.link !== "";
      const hasExternalId = memory.metadata?.externalId;

      // Include all items that have metadata with source information
      const hasSourceMetadata =
        memory.metadata?.source && memory.metadata.source !== "unknown";

      // Include document references (grouped chunks from app_link)
      const isDocumentReference = (memory as any).type === "document";

      return (
        hasActualLink ||
        hasExternalId ||
        hasSourceMetadata ||
        isDocumentReference
      );
    })
    .map((memory) => {
      // Handle document references (grouped chunks)
      if ((memory as any).type === "document") {
        const link = memory.metadata?.link || "";
        const origin = memory.metadata?.origin || "document";
        const title = memory.metadata?.title;
        const siteName = memory.metadata?.siteName;

        // Use title if available, otherwise extract domain name from link
        let displayContent = "Article";
        if (title) {
          displayContent = title;
        } else if (siteName) {
          displayContent = siteName;
        } else {
          try {
            const url = new URL(link);
            displayContent = url.hostname.replace("www.", "") || "Article";
          } catch (e) {
            displayContent = link ? "Article" : "Unknown Article";
          }
        }

        return {
          ...memory,
          source: origin,
          content: displayContent,
          memory: displayContent,
        };
      }

      // Handle regular memory sources
      // Use metadata.source if available (for chroma sources), otherwise use memory.source
      // Never expose "chroma" or "mem0" as a source - they're internal database names
      let source = memory.metadata?.source || memory.source || "unknown";

      // Filter out internal database names - if source is chroma/mem0, prefer metadata.source
      if (source === "chroma" || source === "mem0") {
        // Prefer metadata.source if available, otherwise keep as is (backend should have set it correctly)
        source = memory.metadata?.source || source;
        // If still chroma/mem0 and no metadata.source, fall back to unknown
        if (source === "chroma" || source === "mem0") {
          source = "unknown";
        }
      }

      // For items with metadata but no direct source property, add it
      if (!memory.source && memory.metadata?.source) {
        return {
          ...memory,
          source: source,
          // Use memory content if no separate content field exists
          content: memory.content || memory.memory,
        };
      }

      return {
        ...memory,
        source: source,
      };
    });

  // Don't render if no actual data sources
  if (filteredSources.length === 0) {
    return null;
  }

  // Group memories by source layer for enhanced view
  const groupedMemories: LayerGroup[] = [];
  if (isEnhanced) {
    const layerCounts: { [key: string]: number } = {};

    filteredSources.forEach((memory) => {
      const layer = memory.metadata?.source || memory.source || "unknown";
      layerCounts[layer] = (layerCounts[layer] || 0) + 1;
    });

    Object.entries(layerCounts).forEach(([layer, count]) => {
      // Skip unknown sources
      if (layer.toLowerCase() === "unknown") return;

      const layerMemories = filteredSources.filter((m) => {
        const memoryLayer = m.metadata?.source || m.source || "unknown";
        return memoryLayer === layer;
      });
      groupedMemories.push({
        layer,
        displayName: getSourceDisplayName(layer),
        memories: layerMemories,
        color: getLayerColor(layer),
      });
    });
  }

  const toggleLayer = (layer: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layer)) {
      newExpanded.delete(layer);
    } else {
      newExpanded.add(layer);
    }
    setExpandedLayers(newExpanded);
  };

  return (
    <div className="my-6 max-w-full" style={{ maxWidth: width - 32 }}>
      <div className="space-y-4 not-prose">
        <div>
          <div className="flex flex-row items-center justify-between">
            <span className="flex w-auto flex-row items-center">
              <Brain02Icon size={14} className="mr-2" />
              <span className="text-xs font-medium underline-offset-4 underline decoration-wavy">
                Sources
              </span>
              {isEnhanced && groupedMemories.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                  {groupedMemories.length} sources
                </span>
              )}
            </span>

            {isEnhanced && groupedMemories.length > 0 && (
              <div className="flex gap-1">
                {groupedMemories.map((group) => (
                  <span
                    key={group.layer}
                    className={cn("px-1.5 py-0.5 text-xs rounded", group.color)}
                  >
                    {group.memories.length}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Basic view - horizontal scroll */}
          {!isEnhanced && (
            <div className="flex flex-row gap-2 scroll-none justify-start items-stretch no-scrollbar my-4 w-full overflow-x-auto">
              {filteredSources.map((memory, index) => {
                const hasLink =
                  memory.metadata?.link && memory.metadata.link !== "";
                const displayContent =
                  memory.content || memory.memory || "No content available";
                const displaySource =
                  memory.metadata?.source || memory.source || "unknown";

                const CardContent = (
                  <div
                    className={cn(
                      "flex flex-col line-clamp-1 gap-2 justify-between items-start min-w-[200px] rounded-md p-2.5 transition-colors",
                      hasLink
                        ? "cursor-pointer hover:bg-muted/50"
                        : "cursor-default"
                    )}
                  >
                    <div className="flex items-center">
                      <div className={cn("w-4 h-4 mr-2")}>
                        {displaySource === "unknown" ||
                        displaySource === "mem0" ? (
                          <Brain01Icon size={16} className="w-full h-full" />
                        ) : displaySource === "link" ? (
                          <LinkIcon size={16} className="w-full h-full" />
                        ) : displaySource === "app_link" ||
                          displaySource === "document" ? (
                          memory.metadata?.favicon ? (
                            <img
                              src={memory.metadata.favicon}
                              alt="favicon"
                              className="w-full h-full rounded-sm object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.parentElement!.innerHTML =
                                  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';
                              }}
                            />
                          ) : (
                            <Book02Icon size={16} className="w-full h-full" />
                          )
                        ) : (
                          <img
                            src={getSourceIcon(
                              displaySource,
                              memory.metadata?.link
                            )}
                            alt={`${displaySource} icon`}
                            className="w-full h-full"
                          />
                        )}
                      </div>
                      <div className={cn("text-sm font-medium")}>
                        {getSourceDisplayName(displaySource)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-foreground/60 font-normal line-clamp-2">
                        {displayContent}
                      </p>
                      <p className="text-xs text-foreground/40">
                        {dayjs(
                          memory.metadata?.timestamp || memory.timestamp
                        ).format("MMM D, YYYY")}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <MyTooltip
                    key={
                      memory.id ? `${memory.id}-${index}` : `memory-${index}`
                    }
                    side="top"
                    contentClassName="max-w-[300px]"
                    content={
                      <div>
                        <p className="font-medium">
                          {memory.metadata?.title ||
                            getSourceDisplayName(displaySource)}
                        </p>
                        <p className="text-sm mt-1">
                          {memory.metadata?.description || displayContent}
                        </p>
                        {memory.metadata?.siteName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {memory.metadata.siteName}
                          </p>
                        )}
                      </div>
                    }
                  >
                    {hasLink ? (
                      <a
                        href={memory.metadata.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {CardContent}
                      </a>
                    ) : (
                      CardContent
                    )}
                  </MyTooltip>
                );
              })}
            </div>
          )}

          {/* Enhanced view - grouped by layer */}
          {isEnhanced && groupedMemories.length > 0 && (
            <div className="space-y-3 mt-4">
              {groupedMemories.map((group) => (
                <div
                  key={group.layer}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <button
                    onClick={() => toggleLayer(group.layer)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center">
                      {expandedLayers.has(group.layer) ? (
                        <ChevronDownIcon className="mr-2 h-3.5 w-3.5" />
                      ) : (
                        <ChevronRightIcon className="mr-2 h-3.5 w-3.5" />
                      )}
                      <span className="text-sm font-medium">
                        {group.displayName}
                      </span>
                      <span
                        className={cn(
                          "ml-2 px-1.5 py-0.5 text-xs rounded",
                          group.color
                        )}
                      >
                        {group.memories.length}
                      </span>
                    </div>
                  </button>

                  {expandedLayers.has(group.layer) && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex flex-row gap-2 overflow-x-auto no-scrollbar">
                        {group.memories.map((memory) => {
                          const hasLink =
                            memory.metadata?.link &&
                            memory.metadata.link !== "";
                          const displayContent =
                            memory.content ||
                            memory.memory ||
                            "No content available";
                          const displaySource =
                            memory.metadata?.source ||
                            memory.source ||
                            "unknown";

                          const CardContent = (
                            <div className="flex flex-col gap-2 justify-between items-start min-w-[200px] max-w-[300px] rounded-md p-2.5 bg-gray-50 dark:bg-gray-800 transition-colors">
                              <div className="flex items-center w-full">
                                <div className="w-4 h-4 mr-2">
                                  {displaySource === "unknown" ||
                                  displaySource === "mem0" ? (
                                    <Brain02Icon
                                      size={16}
                                      className="w-full h-full"
                                    />
                                  ) : displaySource === "link" ? (
                                    <LinkIcon
                                      size={16}
                                      className="w-full h-full"
                                    />
                                  ) : displaySource === "app_link" ||
                                    displaySource === "document" ? (
                                    memory.metadata?.favicon ? (
                                      <img
                                        src={memory.metadata.favicon}
                                        alt="favicon"
                                        className="w-full h-full rounded-sm object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display =
                                            "none";
                                          e.currentTarget.parentElement!.innerHTML =
                                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';
                                        }}
                                      />
                                    ) : (
                                      <Book02Icon
                                        size={16}
                                        className="w-full h-full"
                                      />
                                    )
                                  ) : (
                                    <img
                                      src={getSourceIcon(
                                        displaySource,
                                        memory.metadata?.link
                                      )}
                                      alt={`${displaySource} icon`}
                                      className="w-full h-full"
                                    />
                                  )}
                                </div>
                                <div className="text-sm font-medium flex-1 truncate">
                                  {getSourceDisplayName(displaySource)}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 w-full">
                                <p className="text-xs text-foreground/60 font-normal line-clamp-3">
                                  {displayContent}
                                </p>
                                <p className="text-xs text-foreground/40">
                                  {dayjs(
                                    memory.metadata?.timestamp ||
                                      memory.timestamp
                                  ).format("MMM D, YYYY")}
                                </p>
                              </div>
                            </div>
                          );

                          return (
                            <MyTooltip
                              key={memory.id}
                              side="top"
                              contentClassName="max-w-[400px]"
                              content={
                                <div>
                                  <p className="font-medium">
                                    {memory.metadata?.title ||
                                      group.displayName}
                                  </p>
                                  <p className="text-sm mt-1">
                                    {memory.metadata?.description ||
                                      displayContent}
                                  </p>
                                  {memory.metadata?.siteName && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {memory.metadata.siteName}
                                    </p>
                                  )}
                                  {memory.metadata?.externalId && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      <p>ID: {memory.metadata.externalId}</p>
                                    </div>
                                  )}
                                </div>
                              }
                            >
                              {hasLink ? (
                                <a
                                  href={memory.metadata.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                  {CardContent}
                                </a>
                              ) : (
                                <div className="cursor-default">
                                  {CardContent}
                                </div>
                              )}
                            </MyTooltip>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
