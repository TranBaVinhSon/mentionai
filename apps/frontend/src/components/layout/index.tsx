"use client";

import { PropsWithChildren, useEffect } from "react";
import { SignInDialog } from "../sign-in/sign-in-dialog";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useSession } from "next-auth/react";
import { SubscriptionDialog } from "../shared/subscription-dialog";
import { CancelSubscriptionDialog } from "../shared/cancel-subscription-dialog";
import { CampaignBanner } from "../shared/campaign-banner";
import { Header } from "./header";
import { MobileFooter } from "./mobile-footer";
import { Breadcrumbs } from "./breadcrumbs";
import { GlobalLoading } from "./global-loading";
import { usePathname, useRouter } from "next/navigation";

export const Layout = ({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) => {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isOnboardingPage = pathname === "/onboarding";
  const isAppsNewPage = pathname === "/apps/new";

  // Clear flags when user logs out
  // This ensures user sees onboarding on next login if they still don't have a digital twin
  useEffect(() => {
    if (status === "unauthenticated") {
      localStorage.removeItem("onboarding_skipped");
      sessionStorage.removeItem("onboarding_shown"); // Clear session flag on logout
    }
  }, [status]);

  // Redirect to onboarding ONLY ONCE per login session if:
  // 1. User is authenticated
  // 2. Profile data is loaded (not loading)
  // 3. User does NOT have a digital twin (fresh data from profile API)
  // 4. User has NOT skipped onboarding (localStorage - persists across browser sessions)
  // 5. Haven't already shown onboarding in this login session (sessionStorage - survives page refresh)
  // 6. Not already on onboarding or apps/new page
  useEffect(() => {
    // Wait for authentication and profile data to load
    if (status !== "authenticated" || isUserLoading || !user) return;

    // Don't redirect if already on onboarding or apps/new page
    if (isOnboardingPage || isAppsNewPage) return;

    // Don't redirect if already shown onboarding in this login session (survives page refresh)
    const hasShownOnboarding =
      sessionStorage.getItem("onboarding_shown") === "true";
    if (hasShownOnboarding) return;

    // Don't redirect if user already has a digital twin (fresh from profile API)
    if (user.app?.isMe) return;

    // Don't redirect if user has explicitly skipped onboarding
    const hasSkippedOnboarding =
      localStorage.getItem("onboarding_skipped") === "true";
    if (hasSkippedOnboarding) return;

    // User is authenticated, doesn't have digital twin, hasn't skipped → redirect to onboarding
    // Mark as shown so we don't redirect again on page refresh
    sessionStorage.setItem("onboarding_shown", "true");
    router.push("/onboarding");
  }, [status, isUserLoading, user, isOnboardingPage, isAppsNewPage, router]);

  return (
    <div className="min-h-screen">
      <GlobalLoading />
      {!isOnboardingPage && <Header />}
      {/* <Breadcrumbs /> */}

      <div
        className={cn(
          isOnboardingPage ? "pt-0" : "pt-4",
          status === "authenticated" && "pb-4 md:pb-0" // Add padding for mobile footer
        )}
      >
        {/* Campaign Banner - Show only for free users */}
        {!isOnboardingPage && user?.subscriptionPlan === "free" && (
          <CampaignBanner />
        )}
        <div
          className={cn(
            "flex flex-1 flex-col gap-4",
            isOnboardingPage ? "p-0" : "p-4 pt-4"
          )}
        >
          <div className={cn("flex flex-col flex-1 w-full z-10", className)}>
            {children}
          </div>
        </div>
      </div>
      {/* <MobileFooter /> */}
      <SignInDialog />
      <SubscriptionDialog />
      <CancelSubscriptionDialog />
    </div>
  );
};
