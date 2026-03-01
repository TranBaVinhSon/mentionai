"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Search,
  Image as ImageIcon,
  MessageCircle,
  MoreVertical,
  ArrowLeft,
  Share,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitial } from "@/utils/avatar";

interface AppPreviewProps {
  displayName?: string;
  name?: string;
  description?: string;
  logoUrl?: string;
  suggestedQuestions?: string[];
  isPublished?: boolean;
}

export function AppPreview({
  displayName = "Your Name",
  name = "yourname",
  description = "Tell us about yourself...",
  logoUrl,
  suggestedQuestions = [],
  isPublished = false,
}: AppPreviewProps) {
  const validQuestions = suggestedQuestions.filter(
    (q) => q && q.trim().length > 0
  );

  return (
    <div>
      <div className="text-center mb-4">
        <h3 className="text-base font-semibold">Preview</h3>
        <p className="text-sm text-muted-foreground">
          See how your digital clone will appear
        </p>
      </div>

      {/* Mobile Phone Frame */}
      <div className="relative mx-auto w-full max-w-[280px] lg:max-w-[375px]">
        <div className="relative bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] p-1.5 lg:p-2 shadow-2xl">
          <div className="relative bg-black rounded-[1.8rem] lg:rounded-[2.3rem] p-1">
            {/* Screen */}
            <div className="relative bg-background rounded-[1.7rem] lg:rounded-[2.2rem] overflow-hidden flex flex-col h-[500px] lg:h-[700px]">
              {/* Mobile Status Bar */}
              <div className="bg-background px-4 lg:px-6 py-1.5 lg:py-2 flex items-center justify-between text-[10px] lg:text-xs">
                <span className="font-semibold">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2.5 lg:w-4 lg:h-3 border border-foreground rounded-sm">
                    <div className="w-full h-full bg-foreground rounded-sm scale-x-75 origin-right" />
                  </div>
                </div>
              </div>

              {/* Browser URL Bar */}
              <div className="bg-muted/50 px-3 lg:px-4 py-1.5 lg:py-2 border-b border-border">
                <div className="bg-background rounded-full px-2 lg:px-3 py-1 lg:py-1.5 flex items-center gap-1.5 lg:gap-2">
                  <Globe className="size-2.5 lg:size-3 text-muted-foreground" />
                  <span className="text-[10px] lg:text-xs text-muted-foreground flex-1 truncate">
                    mentionai.io/@{name}
                  </span>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto">
                {/* Profile Section */}
                <div className="p-4 lg:p-6 space-y-3 lg:space-y-4">
                  <div className="flex items-start gap-3 lg:gap-4">
                    <Avatar className="size-12 lg:size-16">
                      {logoUrl ? (
                        <AvatarImage src={logoUrl} alt={displayName} />
                      ) : (
                        <AvatarFallback className={cn("text-base lg:text-xl text-white font-medium", getAvatarColor(displayName))}>
                          {getInitial(displayName)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-sm lg:text-lg font-semibold">
                        {displayName}
                      </h2>
                      <p className="text-xs lg:text-sm text-muted-foreground">
                        @{name}
                      </p>
                      {isPublished && (
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px] lg:text-xs"
                        >
                          <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs lg:text-sm">{description}</p>
                </div>

                {/* Suggested Questions */}
                {validQuestions.length > 0 && (
                  <div className="px-4 lg:px-6 pb-4 lg:pb-6">
                    <h3 className="text-xs lg:text-sm font-medium mb-2 lg:mb-3">
                      Try asking:
                    </h3>
                    <div className="space-y-1.5 lg:space-y-2">
                      {validQuestions.slice(0, 3).map((question, index) => (
                        <div
                          key={index}
                          className="p-2 lg:p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors cursor-pointer border border-border"
                        >
                          <p className="text-[11px] lg:text-sm line-clamp-2">
                            {question}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="border-t border-border p-3 lg:p-4 bg-background">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Ask me anything..."
                      className="w-full rounded-full border border-input bg-muted px-3 lg:px-4 py-1.5 lg:py-2 pr-8 lg:pr-10 text-[11px] lg:text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      disabled
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-0.5 lg:right-1 top-1/2 -translate-y-1/2 h-6 w-6 lg:h-7 lg:w-7 rounded-full"
                      disabled
                    >
                      <Send className="size-3 lg:size-3.5" />
                      <span className="sr-only">Send message</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
