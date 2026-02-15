"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { gengarApi, GengarSubscriptionPlan } from "@/services/api";
import { useSubscriptionStore } from "@/store/subscription-state";
import { invalidateUserQuery } from "@/hooks/use-user";
import { useQueryClient } from "@tanstack/react-query";

export default function CancelSuccess() {
  const router = useRouter();
  const { status } = useSession();
  const queryClient = useQueryClient();

  const { fetchSubscriptionData } = useSubscriptionStore();
  useEffect(() => {
    if (status === "authenticated") {
      fetchSubscriptionData();
      invalidateUserQuery(queryClient); // Add this line to re-fetch user data
    }

    setTimeout(() => {
      router.push("/");
    }, 100);
  }, [status, fetchSubscriptionData, queryClient]);

  return (
    <div>
      <p>Redirecting you to the home page...</p>
    </div>
  );
}
