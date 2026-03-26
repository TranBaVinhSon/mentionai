"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSubscriptionStore } from "@/store/subscription-state";
import { invalidateUserQuery, useUser } from "@/hooks/use-user";
import { useQueryClient } from "@tanstack/react-query";

export default function SubscriptionSuccess() {
  const { status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fetchSubscriptionData } = useSubscriptionStore();

  useEffect(() => {
    if (status === "authenticated") {
      fetchSubscriptionData();
      invalidateUserQuery(queryClient); // Add this line to re-fetch user data
    }

    setTimeout(() => {
      router.push("/");
    }, 200);
  }, [status, fetchSubscriptionData, queryClient]);

  return (
    <div>
      <h1>Subscription Successful!</h1>
      <p>Redirecting you to the home page...</p>
    </div>
  );
}
