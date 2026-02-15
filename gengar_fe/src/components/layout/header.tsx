"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Menu,
  X,
  Instagram,
  MoreHorizontal,
  Plus,
  Home,
  Activity,
  User,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { gengarApi } from "@/services/api";
import { useSubscriptionStore } from "@/store/subscription-state";
import { useChatStore } from "@/store/chat";
import { SearchBar } from "./search-bar";
import { useUser } from "@/hooks/use-user";
import { ModelSettings } from "./model-settings";
import { SettingsDialog } from "../shared/settings-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LinkedInLogoIcon, TwitterLogoIcon } from "@radix-ui/react-icons";

export function Header() {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { data: session, status } = useSession();
  const { setTheme, theme } = useTheme();
  const { clearSubscriptionData } = useSubscriptionStore();
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDashboardClick = () => {
    // Check if user has a digital clone with valid uniqueId
    if (user?.app?.isMe && user.app.uniqueId) {
      // User has digital clone with valid uniqueId, redirect to dashboard
      router.push(`/apps/${user.app.uniqueId}/dashboard`);
    } else {
      // User doesn't have digital clone or uniqueId is missing, redirect to create page with me=true
      toast({
        title: "Create Your Digital Clone First",
        description:
          "You need to create your digital clone before accessing the analytics dashboard.",
        variant: "default",
      });
      router.push("/apps/new?me=true");
    }
  };

  const mobileNavItems =
    status === "authenticated"
      ? [
          {
            icon: Home,
            label: "Home",
            href: "/",
            onClick: null,
          },
          {
            icon: Compass,
            label: "Explore",
            href: "/explore",
            onClick: null,
          },
          {
            icon: User,
            label: "My Twin",
            href:
              user?.app?.isMe && user.app.uniqueId
                ? `/apps/${user.app.uniqueId}`
                : "/apps/new?me=true",
            onClick: null,
          },
          {
            icon: Activity,
            label: "Dashboard",
            href:
              user?.app?.isMe && user.app.uniqueId
                ? `/apps/${user.app.uniqueId}/dashboard`
                : "/apps/new?me=true",
            onClick: null,
          },
        ]
      : [];

  return (
    <header
      className={`sticky top-0 left-0 right-0 bg-background z-50 transition-all duration-200 ${
        isScrolled ? "border-b" : ""
      }`}
    >
      <div className="mx-auto px-4 md:px-10">
        <div className="flex items-center justify-between h-16 relative">
          {/* Left side - Mobile menu / Desktop navigation */}
          <div className="flex items-center">
            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="!size-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="flex flex-col h-full">
                    {/* Main Content */}
                    <div className="flex-1 px-8 py-12">
                      {/* Navigation Items */}
                      {status === "authenticated" && (
                        <nav className="space-y-4 mb-8">
                          {mobileNavItems.map((item) => {
                            const isActive =
                              pathname === item.href ||
                              (item.href === "#" &&
                                pathname?.includes("/dashboard"));
                            return item.onClick ? (
                              <button
                                key={item.label}
                                onClick={item.onClick}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                                  isActive
                                    ? "bg-primary/10 text-brand"
                                    : "hover:bg-accent text-foreground"
                                )}
                              >
                                <item.icon className="size-5" />
                                <span className="text-base font-medium">
                                  {item.label}
                                </span>
                              </button>
                            ) : (
                              <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                  isActive
                                    ? "bg-primary/10 text-brand"
                                    : "hover:bg-accent text-foreground"
                                )}
                              >
                                <item.icon className="size-5" />
                                <span className="text-base font-medium">
                                  {item.label}
                                </span>
                              </Link>
                            );
                          })}
                        </nav>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-8 pb-8">
                      {/* Social Links */}
                      <div className="flex gap-6 mb-8">
                        {/* <a
                          href="https://instagram.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-brand transition-colors"
                        >
                          <Instagram className="size-6" />
                        </a> */}
                        <a
                          href="https://x.com/sontbv"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-brand transition-colors"
                        >
                          <TwitterLogoIcon className="size-6" />
                        </a>
                        <a
                          href="https://linkedin.com/in/sontbv/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-brand transition-colors"
                        >
                          <LinkedInLogoIcon className="size-6" />
                        </a>
                      </div>

                      <p className="text-base text-muted-foreground">
                        © 2025 MentionAI
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/explore">
                <Button variant="ghost" className="text-base hidden xl:flex">
                  <Compass className="size-4 mr-1" />
                  Explore
                </Button>
              </Link>
              {/* <Link href="/community">
                <Button variant="ghost" className="text-base hidden xl:flex">
                  Community
                </Button>
              </Link> */}
              {session && (
                <Button
                  variant="ghost"
                  className="text-base"
                  onClick={() => {
                    if (user?.app?.uniqueId) {
                      router.push(`/apps/${user.app.uniqueId}/dashboard`);
                    } else {
                      router.push("/");
                    }
                  }}
                >
                  <Activity className="size-4 mr-1" />
                  Dashboard
                </Button>
              )}
            </div>
          </div>

          {/* Centered Logo - Both Mobile and Desktop */}
          <Link
            href="/"
            className="text-2xl font-bold hover:text-brand transition-colors absolute left-1/2 transform -translate-x-1/2 hidden md:block"
          >
            MentionAI
          </Link>

          {/* Mobile Logo */}
          <Link
            href="/"
            className="text-2xl font-bold hover:text-brand transition-colors md:hidden absolute left-1/2 transform -translate-x-1/2"
          >
            MentionAI
          </Link>

          {/* Right side - Auth buttons */}
          <div className="hidden md:flex items-center gap-4">
            {status === "authenticated" ? (
              <>
                <Link
                  href={
                    user?.app?.isMe ? `/apps/${user.app.uniqueId}` : "/apps/new"
                  }
                >
                  <Button
                    variant="ghost"
                    className="text-brand font-semibold text-base"
                  >
                    {user?.app?.isMe ? (
                      <>
                        {user.app.logo ? (
                          <img
                            src={user.app.logo}
                            alt={user.app.displayName}
                            className="size-5 mr-1 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-5 mr-1 rounded-full bg-brand/20 flex items-center justify-center">
                            <span className="text-base font-semibold">
                              {user.app.displayName?.charAt(0) || "M"}
                            </span>
                          </div>
                        )}
                        My Twin
                      </>
                    ) : (
                      <>
                        <Plus className="size-5 mr-1" />
                        Create
                      </>
                    )}
                  </Button>
                </Link>
                <ModelSettings />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    >
                      <Avatar className="size-8">
                        <AvatarImage
                          src={session?.user?.image || ""}
                          alt={session?.user?.name || ""}
                        />
                        <AvatarFallback>
                          {session?.user?.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session?.user?.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session?.user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <Link href="/pricing">
                        <DropdownMenuItem className="text-base">
                          Pricing
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/features">
                        <DropdownMenuItem className="text-base">
                          Features
                        </DropdownMenuItem>
                      </Link>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <Link href="https://x.com/mentionai" target="_blank">
                      <DropdownMenuItem className="text-base">
                        Follow us
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                      onClick={() => {
                        const themes = ["light", "dark"];
                        const currentIndex = themes.indexOf(theme as any);
                        const nextIndex = (currentIndex + 1) % themes.length;
                        setTheme(themes[nextIndex]);
                      }}
                      className="text-base"
                    >
                      Switch theme
                    </DropdownMenuItem>
                    <Link
                      href="https://mentionai.featurebase.app/"
                      target="_blank"
                    >
                      <DropdownMenuItem className="text-base">
                        Feedback
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                      className="text-base"
                      onClick={() => setSettingsOpen(true)}
                    >
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        signOut();
                        gengarApi.setApiToken();
                        clearSubscriptionData();
                        useChatStore.getState().setIsDebateMode(false);
                        // Clear onboarding skip flag so user sees onboarding on next login if no digital twin
                        localStorage.removeItem("onboarding_skipped");
                      }}
                      className="text-base"
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/signin">
                  <Button variant="link" className="flex text-base">
                    Log in
                  </Button>
                </Link>
                <Link href="/signin">
                  <Button className="text-base">Join for free</Button>
                </Link>
              </>
            )}
          </div>
          <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
      </div>
    </header>
  );
}
