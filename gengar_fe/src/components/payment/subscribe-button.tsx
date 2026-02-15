"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { gengarApi, GengarSubscriptionPlan } from "@/services/api";

import { loadStripe } from "@stripe/stripe-js";
import { Sparkles as SparklesIcon, Loader2 as Loading02Icon } from "lucide-react";
import { useSubscriptionStore } from "@/store/subscription-state";

export function SubscribeButton() {
  const { status, data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const { subscriptionPlan } = useSubscriptionStore();

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const { checkoutSessionId } = await gengarApi.subscribe(
        session?.userId,
        session?.user?.email as string
      );

      if (!checkoutSessionId) {
        throw new Error("Failed to create checkout session");
      }

      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      );
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const result = await stripe.redirectToCheckout({
        sessionId: checkoutSessionId,
      });

      if (result?.error) {
        console.error(result.error);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    status === "authenticated" &&
    subscriptionPlan === GengarSubscriptionPlan.FREE && (
      <button
        className="h-7 bg-orange-400/15 font-medium text-orange-500 px-3 text-xs rounded-full flex items-center justify-center"
        onClick={handleSubscribe}
        disabled={loading}
      >
        <>
          {loading ? (
            <Loading02Icon size={16} className="mr-1 animate-spin" />
          ) : (
            <SparklesIcon size={16} className="mr-1" />
          )}
          <span>Upgrade</span>
        </>
      </button>
    )
  );
}
