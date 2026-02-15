"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { setSignInDialog } from "@/store/app";
import { App } from "@/services/api";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

interface CategorySectionProps {
  title: string;
  apps: App[];
  isUserOwned?: (app: App) => boolean;
  showCategory?: boolean;
  className?: string;
}

export function CategorySection({
  title,
  apps,
  isUserOwned,
  showCategory = false,
  className,
}: CategorySectionProps) {
  const router = useRouter();
  const { status } = useSession();
  const { data: user } = useUser();

  const handleCardClick = (app: App) => {
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

  if (apps.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </h2>
      </div>

      {/* Carousel */}
      <Carousel
        opts={{
          align: "start",
          slidesToScroll: 1,
        }}
        className="w-full group"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {apps.map((app) => (
            <CarouselItem
              key={app.uniqueId}
              className="pl-2 md:pl-4 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6"
            >
              <div>
                {/* Card */}
                <div className="space-y-2 group/card">
                  {/* Image - not clickable */}
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={app.logo}
                      alt={app.displayName}
                      fill
                      className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/10 transition-colors duration-300" />
                  </div>

                  {/* Content */}
                  <div className="space-y-1 px-1">
                    <h3
                      className="text-sm font-medium line-clamp-1 cursor-pointer hover:text-brand transition-colors"
                      onClick={() => handleCardClick(app)}
                    >
                      {app.displayName}
                    </h3>
                    {app.isMe && (
                      <p className="text-xs text-muted-foreground">
                        @{app.name}
                      </p>
                    )}
                    {showCategory && app.category && !app.isMe && (
                      <Badge variant="secondary" className="text-xs h-5">
                        {app.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {apps.length > 4 && (
          <>
            <CarouselPrevious className="hidden md:flex -left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black hover:bg-black/80 text-white hover:text-white border-0 shadow-lg size-10" />
            <CarouselNext className="hidden md:flex -right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black hover:bg-black/80 text-white hover:text-white border-0 shadow-lg size-10" />
          </>
        )}
      </Carousel>
    </div>
  );
}
