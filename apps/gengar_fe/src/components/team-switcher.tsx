"use client";

import * as React from "react";
import { Shapes } from "lucide-react";
import { useRouter } from "next/navigation";
import { emitter, EventTypes } from "@/services/event-emitter";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { setSignInDialog } from "@/store/app";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Plus as Add01Icon, Home as Home01Icon } from "lucide-react";

import mLogo from "../../public/m-logo-transparent.webp";

export const Logo = ({ size = "md" }: { size?: "md" | "lg" }) => {
  return (
    <div
      className={cn(
        "flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground",
        size === "lg" && "size-12"
      )}
    >
      <Shapes className={cn("size-4", size === "lg" && "size-8")} />
    </div>
  );
};

export const Home = ({ size = "md" }: { size?: "md" | "lg" }) => {
  return (
    <div
      className={cn(
        "flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground",
        size === "lg" && "size-12"
      )}
    >
      <Home01Icon className={cn("size-4", size === "lg" && "size-8")} />
    </div>
  );
};

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { resolvedTheme, theme } = useTheme();
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const { status } = useSession();

  useEffect(() => {
    setIsDarkTheme(
      resolvedTheme === "dark" ||
        (resolvedTheme === undefined && theme === "dark")
    );
  }, [resolvedTheme, theme]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          onClick={() => {
            router.push("/");
            emitter.emit(EventTypes.NEW_CHAT);
          }}
        >
          <Image
            src={mLogo.src}
            alt="MentionAI Logo"
            width={32}
            height={32}
            className={cn(
              "object-contain",
              isDarkTheme ? "brightness-0 invert" : ""
            )}
            priority
          />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Home</span>
            <span className="truncate text-xs">@mentionai</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem className="mt-2">
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-black data-[state=open]:text-sidebar-accent-foreground bg-white dark:bg-muted border text-foreground hover:bg-muted"
          onClick={() => {
            if (status === "unauthenticated") {
              setSignInDialog(true);
            } else {
              router.push("/apps/new");
            }
          }}
        >
          <div
            className={cn(
              "flex aspect-square size-8 items-center justify-center rounded-lg text-foreground"
            )}
          >
            <Add01Icon className={cn("size-5")} />
          </div>
          <div className="grid font-medium flex-1 text-left text-sm leading-tight">
            <span>New App</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
