"use client";

import { useSession } from "next-auth/react";
import { GengarSubscriptionPlan } from "@/services/api";
import { Sparkles as SparklesIcon } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export function SubscriptionPlanBadge() {
  const { status } = useSession();
  const { data: user } = useUser();

  if (status !== "authenticated") {
    return (
      <span className="h-7 bg-primary/10 font-medium text-primary px-3 text-xs rounded-full flex items-center justify-center">
        <SparklesIcon size={16} className="mr-2" />
        <span>Free</span>
      </span>
    );
  }

  return (
    <div>
      {status === "authenticated" &&
        user?.subscriptionPlan === GengarSubscriptionPlan.PLUS && (
          <span className="h-7 bg-accent/20 font-medium text-accent-foreground px-3 text-xs rounded-full flex items-center justify-center">
            <>
              <SparklesIcon size={16} className="mr-2" />
              <span>Plus</span>
            </>
          </span>
        )}

      {status === "authenticated" &&
        user?.subscriptionPlan === GengarSubscriptionPlan.FREE && (
          <span className="h-7 bg-primary/10 font-medium text-primary px-3 text-xs rounded-full flex items-center justify-center">
            <>
              <SparklesIcon size={16} className="mr-2" />
              <span>Free</span>
            </>
          </span>
        )}
    </div>
  );
}
