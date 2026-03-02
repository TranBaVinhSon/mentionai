"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  setSignInDialog,
  setSubscriptionDialog,
  useAppStore,
} from "@/store/app";
import { forwardRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSubscriptionStore } from "@/store/subscription-state";
import { gengarApi, GengarSubscriptionPlan } from "@/services/api";
import { loadStripe } from "@stripe/stripe-js";
import { PricingCard } from "@/components/shared/pricing-card";
import {
  PRICING_PLANS,
  FREE_FEATURES,
  PLUS_FEATURES,
  PRO_FEATURES,
} from "@/constants/pricing";

export interface SubscriptionDialogMethods {
  show: () => void;
  hide: () => void;
}

export const SubscriptionDialog = forwardRef((props, ref) => {
  const open = useAppStore((s) => s.isSubscriptionDialog);
  const { status, data: session } = useSession();
  const { subscriptionPlan } = useSubscriptionStore();
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const handleSubscribe = async () => {
    setSubscriptionLoading(true);
    try {
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
    } finally {
      setSubscriptionLoading(false);
    }
  };

  async function handleChoosePlan(plan: GengarSubscriptionPlan) {
    if (status !== "authenticated") {
      setSignInDialog(true);
      setSubscriptionDialog(false);
      return;
    }

    if (plan === GengarSubscriptionPlan.PLUS) {
      await handleSubscribe();
    } else if (plan === GengarSubscriptionPlan.PRO) {
      // TODO: Pro plan coming soon - show a coming soon dialog
      console.log("Pro plan coming soon");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setSubscriptionDialog}>
      <DialogContent className="sm:max-w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl font-bold">
            <span className="text-primary">Intelligent</span> at your fingertips
          </DialogTitle>
          <DialogDescription className="max-w-[900px] text-muted-foreground md:text-lg/relaxed">
            Unlock your productivity by accessing most powerful AI models by
            mentioning them in your conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 mt-6 md:grid-cols-3">
          <PricingCard
            {...PRICING_PLANS[GengarSubscriptionPlan.FREE]}
            features={FREE_FEATURES}
            currentPlan={subscriptionPlan}
            onChoosePlan={handleChoosePlan}
          />
          <PricingCard
            {...PRICING_PLANS[GengarSubscriptionPlan.PLUS]}
            features={PLUS_FEATURES}
            currentPlan={subscriptionPlan}
            onChoosePlan={handleChoosePlan}
            loading={subscriptionLoading}
            isHighlighted={subscriptionPlan === GengarSubscriptionPlan.PLUS}
          />
          <PricingCard
            {...PRICING_PLANS[GengarSubscriptionPlan.PRO]}
            features={PRO_FEATURES}
            currentPlan={subscriptionPlan}
            onChoosePlan={handleChoosePlan}
          />
        </div>

        <DialogFooter className="mt-6">
          <Link
            href="/pricing"
            onClick={() => setSubscriptionDialog(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View full pricing details →
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
