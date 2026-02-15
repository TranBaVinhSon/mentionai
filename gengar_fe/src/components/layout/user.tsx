"use client";

import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signIn } from "next-auth/react";
import { GengarSubscriptionPlan } from "@/services/api";
import { cn } from "@/lib/utils";
import { LogIn as LoginCircle02Icon } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { setSignInDialog } from "@/store/app";

export const User = memo(() => {
  const { data: session, status } = useSession();
  const { data: user } = useUser();

  if (status === "unauthenticated") {
    return (
      <button onClick={() => setSignInDialog(true)}>
        <LoginCircle02Icon size={24} />
      </button>
    );
  }

  return (
    <Avatar
      className={cn(
        "w-7 h-7 border-2 border-orange-500",
        user?.subscriptionPlan === GengarSubscriptionPlan.FREE &&
          "border-blue-500",
        user?.subscriptionPlan === GengarSubscriptionPlan.PLUS &&
          "border-orange-500"
      )}
    >
      <AvatarImage src={session?.user?.image || ""} />
      <AvatarFallback>{session?.user?.name?.charAt(0) || "TS"}</AvatarFallback>
    </Avatar>
  );
});
