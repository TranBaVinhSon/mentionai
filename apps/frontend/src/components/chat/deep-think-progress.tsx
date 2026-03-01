"use client";

import { useState, useEffect, type ComponentType } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ClipboardList,
  Search,
  BarChart2,
  Sparkles,
  MessageSquare,
  StickyNote,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeepThinkContextReference {
  id: string;
  title: string;
  description?: string;
  source?: string;
  url?: string;
  favicon?: string;
  host?: string;
  timestamp?: string;
}

export interface DeepThinkWebResult {
  url: string;
  title: string;
  snippet?: string;
  favicon?: string;
  host?: string;
}

export interface DeepThinkProgressData {
  stage: string;
  label?: string;
  message: string;
  planStep?: number;
  totalSteps?: number;
  iteration?: number;
  confidence?: string;
  metadata?: Record<string, any>;
}

interface DeepThinkProgressProps {
  progressItems: DeepThinkProgressData[];
  conversationUniqueId: string;
  contextReferences?: DeepThinkContextReference[];
  webResults?: DeepThinkWebResult[];
}

const stageLabels: Record<string, string> = {
  planning: "Planning",
  research: "Research",
  analysis: "Analysis",
  synthesis: "Synthesis",
  reflection: "Reflection",
  note: "Note",
};

export function DeepThinkProgress({
  progressItems,
  conversationUniqueId,
  contextReferences = [],
  webResults = [],
}: DeepThinkProgressProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [items, setItems] = useState<DeepThinkProgressData[]>(progressItems);

  useEffect(() => {
    setItems(progressItems);
  }, [progressItems]);

  // We now rely on props-driven updates (like WebSearch tool results),
  // not global window events, to avoid duplication and race conditions.

  if (items.length === 0) {
    return null;
  }

  const latestItem = items[items.length - 1];
  const stageLabel = stageLabels[latestItem.stage] || latestItem.stage;
  // Consider thinking complete if we have reflection stage OR synthesis stage (which is sent when response is ready)
  const hasReflectionStage = items.some(
    (item) => item.stage === "reflection" || item.stage === "synthesis"
  );

  const stageIconMap: Record<string, ComponentType<{ className?: string }>> = {
    planning: ClipboardList,
    research: Search,
    analysis: BarChart2,
    synthesis: Sparkles,
    reflection: MessageSquare,
    note: StickyNote,
  };

  const StatusIcon = hasReflectionStage ? Sparkles : Loader2;
  const statusLabel = hasReflectionStage ? "Thought" : "Thinking";

  const personaReferences: DeepThinkContextReference[] =
    contextReferences.slice(0, 8);
  const webSearchItems: DeepThinkWebResult[] = webResults.slice(0, 8);

  const pillBaseClasses =
    "inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors";
  const pillInteractiveClasses =
    "hover:border-primary/50 hover:bg-primary/10 hover:text-foreground";

  const renderContextReferences = (show: boolean) => {
    if (!show || personaReferences.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {personaReferences.map((reference: DeepThinkContextReference) => {
          const subtitle = [reference.source, reference.host]
            .filter(Boolean)
            .join(" • ");

          const chip = (
            <div
              className={cn(
                pillBaseClasses,
                pillInteractiveClasses,
                "group max-w-[280px] px-3 py-1 text-xs"
              )}
            >
              <span className="relative flex size-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-background/80">
                {reference.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={reference.favicon}
                    alt={reference.host || reference.source || "context"}
                    className="size-5 rounded-sm object-cover"
                  />
                ) : (
                  <Lightbulb className="size-5 text-muted-foreground" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-foreground/90 group-hover:text-foreground">
                  {reference.title}
                </span>
                {subtitle && (
                  <span className="truncate text-[10px] text-muted-foreground group-hover:text-muted-foreground/80">
                    {subtitle}
                  </span>
                )}
              </span>
            </div>
          );

          return reference.url ? (
            <a
              key={reference.id}
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {chip}
            </a>
          ) : (
            <div key={reference.id}>{chip}</div>
          );
        })}
      </div>
    );
  };

  const renderWebResults = (show: boolean) => {
    if (!show || webSearchItems.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {webSearchItems.map((result: DeepThinkWebResult) => {
          const chip = (
            <div
              className={cn(
                pillBaseClasses,
                pillInteractiveClasses,
                "group max-w-[280px] px-3 py-1 text-xs"
              )}
            >
              <span className="relative flex size-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-background/80">
                {result.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.favicon}
                    alt={result.host || "web"}
                    className="size-5 rounded-sm object-cover"
                  />
                ) : (
                  <Search className="size-5 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-foreground/90 group-hover:text-foreground">
                  {result.title}
                </div>
                {result.host && (
                  <div className="truncate text-[10px] text-muted-foreground group-hover:text-muted-foreground/80">
                    {result.host}
                  </div>
                )}
              </div>
            </div>
          );

          return (
            <a
              key={result.url}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {chip}
            </a>
          );
        })}
      </div>
    );
  };

  const getStageIcon = (stage: string) => {
    return stageIconMap[stage] || Lightbulb;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <CollapsibleTrigger className="w-full">
        <div className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm shadow-sm transition-colors hover:border-primary/50">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <StatusIcon
              className={cn(
                "size-4",
                hasReflectionStage
                  ? "animate-pulse"
                  : "animate-spin text-primary/70"
              )}
            />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {statusLabel}
            </span>
            <span
              className={cn(
                pillBaseClasses,
                "px-2 py-[2px] text-[10px] uppercase"
              )}
            >
              {latestItem.label || stageLabel}
            </span>
            <span className="truncate text-muted-foreground/80">
              {latestItem.message}
            </span>
          </div>
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground">
            {isOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="space-y-4 rounded-xl border border-border/60 bg-background/80 px-4 py-4 shadow-sm">
          {items.map((item, index) => {
            const itemStageLabel = stageLabels[item.stage] || item.stage;
            const ItemIcon = getStageIcon(item.stage);
            const isLast = index === items.length - 1;
            const shouldShowContext =
              personaReferences.length > 0 &&
              item.message?.toLowerCase().includes("persona references");
            const shouldShowWebResults =
              webSearchItems.length > 0 &&
              item.message?.toLowerCase().includes("web results");
            const metadata = (item.metadata ?? {}) as Record<string, any>;

            return (
              <div
                key={`${item.stage}-${index}`}
                className={cn("relative flex gap-3", isLast ? "" : "pb-6")}
              >
                <div className="flex w-4 flex-col items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/20">
                    <ItemIcon className="size-3 text-muted-foreground" />
                  </div>
                  {!isLast && (
                    <div className="mt-1 h-full w-px flex-1 bg-border/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2 rounded-lg bg-background/60 ">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        pillBaseClasses,
                        "px-2.5 py-0.5 text-[11px] font-semibold text-foreground/90"
                      )}
                    >
                      {item.label || itemStageLabel}
                    </span>
                    {item.confidence && (
                      <span
                        className={cn(
                          pillBaseClasses,
                          "px-2.5 py-0.5 text-[11px]"
                        )}
                      >
                        Confidence {item.confidence}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-5 text-muted-foreground/80">
                    {item.message}
                  </p>
                  {Object.keys(metadata).length > 0 && (
                    <div className="space-y-2 text-xs text-muted-foreground/80">
                      {/* Reference counters (from retrieval events) */}
                      {typeof metadata.totalUnique === "number" && (
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={cn(
                              pillBaseClasses,
                              "px-2.5 py-0.5 text-[11px]"
                            )}
                          >
                            References: {metadata.totalUnique}
                          </span>
                          {typeof metadata.newInThisRound === "number" && (
                            <span
                              className={cn(
                                pillBaseClasses,
                                "px-2.5 py-0.5 text-[11px]"
                              )}
                            >
                              New: {metadata.newInThisRound}
                            </span>
                          )}
                          {metadata.toolBreakdown && (
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(metadata.toolBreakdown).map(
                                ([tool, count]) => (
                                  <span
                                    key={tool}
                                    className={cn(
                                      pillBaseClasses,
                                      "px-2.5 py-0.5 text-[11px]"
                                    )}
                                  >
                                    {tool}: {String(count)}
                                  </span>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Planning details */}
                      {Array.isArray(metadata.keyPoints) && (
                        <div>
                          <div className="mb-1 text-[11px] font-medium text-foreground/80">
                            Key points
                          </div>
                          <ul className="space-y-1 pl-4 text-[11px] leading-4 text-muted-foreground/80 marker:text-muted-foreground">
                            {metadata.keyPoints
                              .slice(0, 6)
                              .map((kp: string, i: number) => (
                                <li key={i}>{kp}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(metadata.plan) && (
                        <div>
                          <div className="mb-1 text-[11px] font-medium text-foreground/80">
                            Plan
                          </div>
                          <ol className="space-y-1 pl-4 text-[11px] leading-4 text-muted-foreground/80 marker:text-muted-foreground">
                            {metadata.plan
                              .slice(0, 10)
                              .map((step: string, i: number) => (
                                <li key={i}>{step}</li>
                              ))}
                          </ol>
                        </div>
                      )}
                      {/* Web search details */}
                      {(Array.isArray(metadata.queries) ||
                        typeof metadata.resultCount === "number" ||
                        Array.isArray(metadata.topDomains)) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {typeof metadata.resultCount === "number" && (
                            <span
                              className={cn(
                                pillBaseClasses,
                                "px-2.5 py-0.5 text-[11px]"
                              )}
                            >
                              Results: {metadata.resultCount}
                            </span>
                          )}
                          {Array.isArray(metadata.queries) &&
                            metadata.queries
                              .slice(0, 3)
                              .map((q: string, i: number) => (
                                <span
                                  key={i}
                                  className={cn(
                                    pillBaseClasses,
                                    "px-2.5 py-0.5 text-[11px]"
                                  )}
                                >
                                  {q}
                                </span>
                              ))}
                          {Array.isArray(metadata.topDomains) &&
                            metadata.topDomains
                              .slice(0, 4)
                              .map(
                                (
                                  domain: { host: string; count: number },
                                  i: number
                                ) => (
                                  <span
                                    key={i}
                                    className={cn(
                                      pillBaseClasses,
                                      "px-2.5 py-0.5 text-[11px]"
                                    )}
                                  >
                                    {domain.host}: {domain.count}
                                  </span>
                                )
                              )}
                        </div>
                      )}
                      {/* Opened URLs */}
                      {Array.isArray(metadata.openedUrls) && (
                        <div>
                          <div className="mb-1 text-[11px] font-medium text-foreground/80">
                            Opened
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {metadata.openedUrls
                              .slice(0, 4)
                              .map((url: string, i: number) => {
                                let label = url;
                                try {
                                  label = new URL(url).host;
                                } catch {}
                                return (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      pillBaseClasses,
                                      pillInteractiveClasses,
                                      "px-2.5 py-0.5 text-[11px]"
                                    )}
                                  >
                                    {label}
                                  </a>
                                );
                              })}
                          </div>
                        </div>
                      )}
                      {/* Recap metrics */}
                      {(typeof metadata.durationSec === "number" ||
                        typeof metadata.stepsExecuted === "number" ||
                        typeof metadata.toolCalls === "number") && (
                        <div className="flex flex-wrap gap-2">
                          {typeof metadata.durationSec === "number" && (
                            <span
                              className={cn(
                                pillBaseClasses,
                                "px-2.5 py-0.5 text-[11px]"
                              )}
                            >
                              {String(metadata.durationSec)}s
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {renderContextReferences(shouldShowContext)}
                  {renderWebResults(shouldShowWebResults)}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
