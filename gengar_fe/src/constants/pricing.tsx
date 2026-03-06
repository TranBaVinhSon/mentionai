import { GengarSubscriptionPlan } from "@/services/api";
import { ReactNode } from "react";

export interface PricingFeature {
  text: string | ReactNode;
  tooltip?: string;
  tooltipIcon?: "info" | "vision";
  isNew?: boolean;
  socialIcons?: Array<{
    src: string;
    alt: string;
  }>;
  modelIcons?: Array<{
    model: string;
    name: string;
  }>;
}

export interface PricingPlan {
  plan: GengarSubscriptionPlan;
  title: string;
  description: string;
  price: number;
  footerText?: string;
}

export const PRICING_PLANS: Record<GengarSubscriptionPlan, PricingPlan> = {
  [GengarSubscriptionPlan.FREE]: {
    plan: GengarSubscriptionPlan.FREE,
    title: "Free",
    description:
      "Start your digital mind. Access core AI models and begin training from up to 3 social accounts and 5 content links.",
    price: 0,
    footerText: "Login is required to activate all features",
  },
  [GengarSubscriptionPlan.PLUS]: {
    plan: GengarSubscriptionPlan.PLUS,
    title: "Plus",
    description:
      "Unlock your full digital mind: top models, unlimited sources, analytics, and priority capacity.",
    price: 15,
  },
  [GengarSubscriptionPlan.PRO]: {
    plan: GengarSubscriptionPlan.PRO,
    title: "Pro",
    description:
      "For professionals scaling their digital mind with advanced features and priority support.",
    price: 40,
    footerText: "Coming soon",
  },
};

export const FREE_FEATURES: PricingFeature[] = [
  { text: "Chat with any digital mind" },
  {
    text: "Access to all basic AI models",
    tooltip: "GPT-4o-mini, Gemini flash, Claude Haiku...etc",
  },
  {
    text: "10 messages/month on advanced models",
    tooltip: "Access GPT-4o, Claude Sonnet, Gemini Pro with 10 messages per month",
    isNew: true,
  },
  {
    text: "Start your digital mind",
    tooltip:
      "Train from up to 3 social accounts and 5 content links",
  },
];

export const PLUS_FEATURES: PricingFeature[] = [
  { text: "All Free features included" },
  { text: "Full digital mind with unlimited sources", isNew: true },
  {
    text: "Unlimited social media integrations",
    isNew: true,
    socialIcons: [
      { src: "/icons/medium.svg", alt: "Medium" },
      { src: "/icons/github.svg", alt: "GitHub" },
      { src: "/icons/linkedin.svg", alt: "LinkedIn" },
      { src: "/icons/reddit.svg", alt: "Reddit" },
    ],
  },
  {
    text: "Unlimited content links and sources",
    isNew: true,
    tooltip:
      "Add unlimited blog posts, YouTube videos, and other content sources",
  },
  {
    text: "Analytics dashboard",
    isNew: true,
    tooltip:
      "View detailed insights about your digital mind's interactions and performance",
  },
  {
    text: "Advanced AI models (GPT-4.1, Claude Sonnet, Gemini Pro, Perplexity, Grok)",
    modelIcons: [
      { model: "gpt-4", name: "GPT-4" },
      { model: "claude", name: "Claude" },
      { model: "gemini", name: "Gemini" },
      { model: "perplexity", name: "Perplexity" },
      { model: "grok", name: "Grok" },
    ],
  },
  {
    text: "Reasoning AI models (o3, gemini 2.5 pro...etc)",
    modelIcons: [
      { model: "o3", name: "O3" },
      { model: "gemini", name: "Gemini" },
    ],
  },
];

export const PRO_FEATURES: PricingFeature[] = [
  { text: "All Plus features included" },
  { text: "Up to 2 digital minds" },
  { text: "Deeper integration with social media" },
  { text: "Custom domain", isNew: true },
  { text: "Advanced dashboard analytics", isNew: true },
  { text: "Monetization models (coming soon)", isNew: true },
  { text: "Priority development" },
];
