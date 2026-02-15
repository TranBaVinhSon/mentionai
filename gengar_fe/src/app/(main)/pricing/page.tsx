"use client";

import { useSession } from "next-auth/react";
import { useSubscriptionStore } from "@/store/subscription-state";
import { gengarApi, GengarSubscriptionPlan } from "@/services/api";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";
import { setSignInDialog } from "@/store/app";
import {
  Accordion,
  AccordionContent,
  AccordionTrigger,
  AccordionItem,
} from "@/components/ui/accordion";
import { PricingCard } from "@/components/shared/pricing-card";
import {
  PRICING_PLANS,
  FREE_FEATURES,
  PLUS_FEATURES,
  PRO_FEATURES,
} from "@/constants/pricing";

export default function FeaturesPage() {
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
    }

    if (plan === GengarSubscriptionPlan.PLUS) {
      await handleSubscribe();
    } else if (plan === GengarSubscriptionPlan.PRO) {
      // TODO: Pro plan coming soon - show a coming soon dialog
      console.log("Pro plan coming soon");
    } else if (plan === GengarSubscriptionPlan.FREE) {
      // TODO: Display a dialog to confirm the cancellation
    }
  }
  return (
    <section className="w-full py-10 md:py-12 lg:py-16">
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">
            Build your <span className="text-primary">Digital Mind</span>
          </h2>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Create a persistent digital mind from your public content. Reflect
            in private or interact in public—your AI thinks with your knowledge
            and speaks in your voice.
          </p>
        </div>

        <div className="grid gap-4 mt-8 md:grid-cols-3 md:gap-6 mx-auto md:px-4">
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

        <div className="mt-12 md:gap-8 md:max-w-5xl mx-auto md:px-12">
          <h3 className="text-2xl font-semibold text-center">
            Frequently Asked Questions
          </h3>
          <Accordion type="single" collapsible className="text-lg">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                How does the digital mind work?
              </AccordionTrigger>
              <AccordionContent>
                Your digital mind is an AI that learns from your public content
                and conversations. With the Free plan, you can start by
                connecting one social account and adding one content link to
                build the foundation. Plus users can connect unlimited social
                accounts (Facebook, Threads, LinkedIn, etc.), add unlimited
                content sources, and access analytics. MentionAI uses this
                information to personalize your AI so it can respond and
                interact in a way that reflects your knowledge, style, and
                personality.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What about data privacy?</AccordionTrigger>
              <AccordionContent>
                Your digital mind is an AI that learns from your public content.
                We won't aggregate any private data from your social accounts.
              </AccordionContent>
            </AccordionItem>
            {/* <AccordionItem value="item-4">
              <AccordionTrigger>
                What are the model usage limits?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <p className="">
                    Plus users receive the following monthly allowances:
                  </p>
                  <ul className="space-y-1 list-disc pl-6">
                    <li>
                      Unlimited access to Tier 1 models (such as GPT-4o-mini,
                      Gemini flash)
                    </li>
                    <li>
                      400 messages for Tier 2 models (such as GPT-4o, Claude
                      sonnet, Gemini Pro, Grok)
                    </li>
                    <li>20 messages for Tier 3 models (o1-mini, o1-preview)</li>
                    <li>
                      100 generations for image/video generation models (such as
                      DALL-E 3, Flux pro)
                    </li>
                  </ul>
                  <p className="text-gray-600 italic">
                    All usage limits reset on the first day of each month.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem> */}
          </Accordion>
        </div>

        <div className="flex justify-center items-center mt-12">
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Any questions? Contact us at{" "}
            <a
              href="mailto:contact@mentionai.io"
              className="text-primary underline"
            >
              contact@mentionai.io
            </a>
          </p>
        </div>
      </div>

      {/* <footer className="mt-auto">
        <div className="flex flex-row items-center justify-center w-full max-w-3xl mx-auto py-6 md:py-8 lg:py-10 px-4 md:px-6 gap-4">
          <Link href="/about-us" className="text-gray-600 hover:text-primary">
            About Us
          </Link>
          <Link
            href="/terms-of-service"
            className="text-gray-600 hover:text-primary"
          >
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-gray-600 hover:text-primary">
            Privacy Policy
          </Link>
        </div>
      </footer> */}
    </section>
  );
}
