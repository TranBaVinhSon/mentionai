"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export interface ProfileHoverCardProps {
  avatar?: string;
  displayName: string;
  username: string;
  description?: string;
  isPublished?: boolean;
  isMe?: boolean;
  children: ReactNode;
  className?: string;
}

export function ProfileHoverCard({
  avatar,
  displayName,
  username,
  description,
  isPublished = true,
  isMe = false,
  children,
  className,
}: ProfileHoverCardProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/@${username}`);
  };

  const handleTalkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/@${username}`);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onClick={handleClick}
            className="cursor-pointer hover:underline inline-flex items-center"
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="p-0 border-0 bg-transparent shadow-none max-w-none"
          sideOffset={10}
        >
          <Card
            className={cn("w-80 border shadow-lg bg-background", className)}
          >
            <CardContent className="p-4 space-y-4">
              {/* Header with Avatar and Basic Info */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar className="w-16 h-16 border-2 border-background shadow-sm">
                    <AvatarImage
                      src={
                        avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          displayName
                        )}&background=random`
                      }
                      alt={displayName}
                    />
                    <AvatarFallback className="text-lg font-medium">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <div
                    className={cn(
                      "absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-background",
                      isPublished ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                </div>

                {/* Basic Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate text-base">
                      {displayName}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">@{username}</p>
                </div>
              </div>

              {/* Description */}
              {description && (
                <div className="px-1">
                  <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                    {description}
                  </p>
                </div>
              )}

              {/* Talk Button */}
              <div className="pt-2">
                <Button onClick={handleTalkClick} className="w-full" size="sm">
                  Talk with {displayName}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
