"use client";

import { signOut, useSession } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { gengarApi, GengarSubscriptionPlan } from "@/services/api";
import { useSubscriptionStore } from "@/store/subscription-state";
import { useChatStore } from "@/store/chat";
import {
  MessageCircle as Comment01Icon,
  Monitor as ComputerIcon,
  LogIn as Login01Icon,
  LogOut as Logout01Icon,
  DollarSign as MoneySendCircleIcon,
  Moon as MoonSlowWindIcon,
  Twitter as NewTwitterIcon,
  Settings as Settings02Icon,
  Sparkles as SparklesIcon,
  Sun as Sun02Icon,
  ChevronsUpDown as UnfoldMoreIcon,
  CreditCard,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { setCancelSubscriptionDialog, setSignInDialog } from "@/store/app";
import Link from "next/link";
import { SettingsDialog } from "./shared/settings-dialog";
import { useState } from "react";

export function NavUser() {
  const { setTheme, theme } = useTheme();

  const { data: session, status } = useSession();

  const { isMobile } = useSidebar();

  const { subscriptionPlan, clearSubscriptionData } = useSubscriptionStore();

  const [settingsOpen, setSettingsOpen] = useState(false);

  if (status === "unauthenticated") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => {
              setSignInDialog(true);
            }}
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
              <Login01Icon className="size-5" />
            </div>
            <div className="grid flex-1 text-left leading-tight">Sign In</div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={session?.user?.image || ""}
                  alt={session?.user?.name || ""}
                />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {session?.user?.name || ""}
                </span>
                <span className="truncate text-xs">
                  {session?.user?.email || ""}
                </span>
              </div>
              <UnfoldMoreIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={session?.user?.image || ""}
                    alt={session?.user?.name || ""}
                  />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {session?.user?.name || ""}
                  </span>
                  <span className="truncate text-xs">
                    {session?.user?.email || ""}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href="/pricing">
                <DropdownMenuItem>
                  <CreditCard size={16} />
                  <span className="text-sm">Pricing</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/features">
                <DropdownMenuItem>
                  <Zap size={16} />
                  <span className="text-sm">Features</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <Link href="https://x.com/mentionai" target="_blank">
                <DropdownMenuItem>
                  <NewTwitterIcon size={16} />
                  <span className="text-sm">Follow us</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                onClick={() => {
                  const themes = ["light", "dark"];
                  const currentIndex = themes.indexOf(theme as any);
                  const nextIndex = (currentIndex + 1) % themes.length;
                  setTheme(themes[nextIndex]);
                }}
              >
                {!theme && <MoonSlowWindIcon size={16} />}
                {theme === "light" && <MoonSlowWindIcon size={16} />}
                {theme === "dark" && <Sun02Icon size={16} />}
                <span className="text-sm">Switch theme</span>
              </DropdownMenuItem>
              <Link href="https://mentionai.featurebase.app/" target="_blank">
                <DropdownMenuItem>
                  <Comment01Icon size={16} />
                  <span className="text-sm">Feedback</span>
                </DropdownMenuItem>
              </Link>

              <DropdownMenuItem asChild>
                <div
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Settings02Icon size={16} />
                  <span className="text-sm">Settings</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {!!session && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    signOut({ callbackUrl: "/" });
                    gengarApi.setApiToken();
                    clearSubscriptionData();
                    // Clear debate mode on logout
                    useChatStore.getState().setIsDebateMode(false);
                    // Clear onboarding skip flag so user sees onboarding on next login if no digital twin
                    localStorage.removeItem("onboarding_skipped");
                  }}
                >
                  <Logout01Icon />
                  Log out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
