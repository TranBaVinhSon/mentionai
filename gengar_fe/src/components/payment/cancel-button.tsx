"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { GengarApi, gengarApi, GengarSubscriptionPlan } from "@/services/api";
import { Sparkles as SparklesIcon, Loader2 as Loading02Icon } from "lucide-react";
import { useSubscriptionStore } from "@/store/subscription-state";

export function CancelButton() {
  const { status } = useSession();
  const [loading, setLoading] = useState(false);

  const { subscriptionPlan, subscriptionPlanCancelAt, fetchSubscriptionData } =
    useSubscriptionStore();

  const handleCancel = async () => {
    try {
      setLoading(true);
      await gengarApi.cancelSubscription();
      // Optionally, you can add a success message or redirect the user
      alert("Subscription cancelled successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    status === "authenticated" &&
    subscriptionPlan === GengarSubscriptionPlan.PLUS && (
      <button
        className="h-7 bg-orange-400/15 font-medium text-orange-500 px-3 text-xs rounded-full flex items-center justify-center"
        onClick={handleCancel}
        disabled={loading}
      >
        <>
          {loading ? (
            <Loading02Icon size={16} className="mr-1 animate-spin" />
          ) : (
            <SparklesIcon size={16} className="mr-1" />
          )}
          <span>Cancel Plus plan</span>
        </>
      </button>
    )
  );
}
