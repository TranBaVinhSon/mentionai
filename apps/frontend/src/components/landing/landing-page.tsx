"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MessageSquare,
  Zap,
  Globe,
  Link2,
  Shield,
  BarChart3,
  Users,
  Clock,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "motion/react";
import { useInView } from "motion/react";

// Avatar imports for social proof
import annieAvatar from "../../../public/avatars/annie.png";
import gagandtAvatar from "../../../public/avatars/gagandt.jpeg";
import kienAvatar from "../../../public/avatars/kien.jpeg";
import minhAvatar from "../../../public/avatars/minh.jpeg";
import sonAvatar from "../../../public/avatars/son.jpeg";
import truongAvatar from "../../../public/avatars/truong.png";

const profileAvatars = [
  { src: sonAvatar, name: "Son" },
  { src: annieAvatar, name: "Annie" },
  { src: gagandtAvatar, name: "Gagan" },
  { src: kienAvatar, name: "Kien" },
  { src: minhAvatar, name: "Minh" },
  { src: truongAvatar, name: "Truong" },
];

// Animation wrapper
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const platforms = [
  { name: "LinkedIn", icon: "/icons/linkedin.svg" },
  { name: "GitHub", icon: "/icons/github.svg" },
  { name: "Reddit", icon: "/icons/reddit.svg" },
  { name: "Medium", icon: "/icons/medium.svg" },
  { name: "Substack", icon: "/icons/substack.svg" },
  { name: "Twitter", icon: "/icons/twitter.svg" },
];

const steps = [
  {
    number: "01",
    title: "Connect your presence",
    description:
      "Link your social accounts, blogs, and content. We aggregate your posts, comments, and writing style.",
    icon: <Link2 className="size-5" />,
  },
  {
    number: "02",
    title: "AI learns your voice",
    description:
      "Our AI analyzes your content to capture your unique tone, expertise, and personality across all interactions.",
    icon: <Zap className="size-5" />,
  },
  {
    number: "03",
    title: "Share your AI Profile",
    description:
      "Get a unique URL (mentionai.io/@you) and let anyone have a conversation with your AI Profile, 24/7.",
    icon: <Globe className="size-5" />,
  },
];

const features = [
  {
    icon: <MessageSquare className="size-5 text-purple-400" />,
    title: "Conversations that sound like you",
    description:
      "Your AI Profile responds with your voice, knowledge, and perspective. People feel like they are talking to you.",
  },
  {
    icon: <Clock className="size-5 text-blue-400" />,
    title: "Available around the clock",
    description:
      "While you sleep, travel, or focus on deep work, your AI Profile keeps engaging your audience.",
  },
  {
    icon: <Shield className="size-5 text-green-400" />,
    title: "You stay in control",
    description:
      "Set boundaries on topics, review conversations, and fine-tune responses. Your profile, your rules.",
  },
  {
    icon: <BarChart3 className="size-5 text-orange-400" />,
    title: "Understand your audience",
    description:
      "Track who is chatting, what they ask about, and where they come from. Actionable insights, not vanity metrics.",
  },
  {
    icon: <Users className="size-5 text-pink-400" />,
    title: "Built for creators and professionals",
    description:
      "Whether you are a developer, consultant, creator, or thought leader, your AI Profile works for your use case.",
  },
  {
    icon: <Globe className="size-5 text-cyan-400" />,
    title: "One link, global reach",
    description:
      "Share your AI Profile URL anywhere. On your bio, email signature, website, or social media.",
  },
];

const faqs = [
  {
    question: "What is an AI Profile?",
    answer:
      "An AI Profile is a conversational AI version of you, trained on your public social media content, blog posts, and writing. Anyone with your link can have a real-time conversation and get responses that reflect your voice and expertise.",
  },
  {
    question: "What data does it learn from?",
    answer:
      "We connect to your public profiles on LinkedIn, Reddit, Medium, GitHub, Substack, Twitter, and more. You can also add blog posts and YouTube videos. The AI only learns from content you explicitly connect.",
  },
  {
    question: "Is it free to create an AI Profile?",
    answer:
      "Yes, creating a basic AI Profile is completely free. For advanced features like analytics dashboards, priority processing, and unlimited conversations, MentionAI Plus is available starting at $9.99/month.",
  },
  {
    question: "How accurate is it?",
    answer:
      "Our AI achieves 95% accuracy in replicating communication styles. The more content you connect, the more authentic your AI Profile becomes. You can also fine-tune responses and set topic boundaries.",
  },
  {
    question: "Can I control what my AI Profile says?",
    answer:
      "Absolutely. You can set suggested questions, configure topic boundaries, review conversation history, and adjust your AI Profile behavior at any time. You always remain in control.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pt-16">
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-purple-500/[0.08] via-transparent to-transparent rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-4xl mx-auto pt-20 pb-24 md:pt-32 md:pb-32">
            <FadeIn className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-muted-foreground mb-8">
                <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                Now in public beta
              </div>
            </FadeIn>

            <FadeIn delay={0.1} className="text-center">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]">
                Your profile
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  can talk.
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.2} className="text-center mt-6 md:mt-8">
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Turn your social media presence into a conversational AI. Anyone
                can chat with your AI Profile and get answers that sound exactly
                like you.
              </p>
            </FadeIn>

            <FadeIn delay={0.3} className="text-center mt-10">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-base px-8 h-12 gap-2" asChild>
                  <Link href="/signin">
                    Create your AI Profile
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-12 border-white/10 hover:bg-white/5"
                  asChild
                >
                  <a href="/@sontbv" target="_blank" rel="noopener noreferrer">
                    See a live example
                  </a>
                </Button>
              </div>
            </FadeIn>

            {/* Social proof avatars */}
            <FadeIn delay={0.4} className="text-center mt-12">
              <div className="flex items-center justify-center gap-3">
                <div className="flex -space-x-2">
                  {profileAvatars.map((avatar, i) => (
                    <div
                      key={i}
                      className="size-8 rounded-full border-2 border-background overflow-hidden"
                    >
                      <Image
                        src={avatar.src}
                        alt={avatar.name}
                        width={32}
                        height={32}
                        className="size-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Joined by creators and professionals
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Platform Logos */}
        <section className="border-y border-white/5 bg-white/[0.02]">
          <div className="max-w-5xl mx-auto px-4 py-10 md:py-12">
            <FadeIn>
              <p className="text-center text-sm text-muted-foreground mb-8 tracking-wide uppercase">
                Connects with your existing presence
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                {platforms.map((platform) => (
                  <div
                    key={platform.name}
                    className="flex items-center gap-2.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    <Image
                      src={platform.icon}
                      alt={platform.name}
                      width={20}
                      height={20}
                      className="size-5 opacity-60"
                    />
                    <span className="text-sm font-medium">{platform.name}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* How It Works */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-5xl mx-auto">
            <FadeIn className="text-center mb-16 md:mb-20">
              <p className="text-sm text-purple-400 font-medium tracking-wide uppercase mb-4">
                How it works
              </p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Three steps to your AI Profile
              </h2>
            </FadeIn>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {steps.map((step, i) => (
                <FadeIn key={step.number} delay={i * 0.15}>
                  <div className="relative group">
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-white/5 group-hover:text-white/10 transition-colors">
                        {step.number}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground">
                        {step.icon}
                      </div>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Profile Preview */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-t from-purple-500/5 via-transparent to-transparent rounded-full blur-3xl" />
          </div>

          <div className="max-w-5xl mx-auto">
            <FadeIn className="text-center mb-16">
              <p className="text-sm text-purple-400 font-medium tracking-wide uppercase mb-4">
                The AI Profile experience
              </p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                A new kind of profile page
              </h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
                Your AI Profile is a living, breathing representation of your
                online presence. People don&apos;t just read about you. They
                talk to you.
              </p>
            </FadeIn>

            {/* Profile Card Mock */}
            <FadeIn delay={0.2}>
              <div className="max-w-lg mx-auto">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                  {/* Profile Header */}
                  <div className="p-8 text-center">
                    <div className="size-20 rounded-full mx-auto mb-4 overflow-hidden border-2 border-white/10">
                      <Image
                        src={sonAvatar}
                        alt="Example profile"
                        width={80}
                        height={80}
                        className="size-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-semibold">Son Tran</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      @sontbv
                    </p>
                    <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">
                      Founder & CEO at MentionAI. Building the future of AI
                      profiles.
                    </p>

                    {/* Connected platforms */}
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {["linkedin", "github", "twitter"].map((p) => (
                        <div
                          key={p}
                          className="size-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
                        >
                          <Image
                            src={`/icons/${p}.svg`}
                            alt={p}
                            width={14}
                            height={14}
                            className="size-3.5"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Questions */}
                  <div className="border-t border-white/5 px-6 py-5">
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">
                      Ask me about
                    </p>
                    <div className="space-y-2">
                      {[
                        "What inspired you to build MentionAI?",
                        "How does the AI Profile technology work?",
                        "What advice for first-time founders?",
                      ].map((q, i) => (
                        <div
                          key={i}
                          className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-white/5 bg-white/[0.02] text-muted-foreground flex items-center justify-between group"
                        >
                          <span>{q}</span>
                          <ChevronRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="border-t border-white/5 px-6 py-4">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02]">
                      <span className="text-sm text-muted-foreground/50">
                        Ask anything...
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground/30 ml-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Features Grid */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-5xl mx-auto">
            <FadeIn className="text-center mb-16 md:mb-20">
              <p className="text-sm text-purple-400 font-medium tracking-wide uppercase mb-4">
                Built for impact
              </p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Everything you need
              </h2>
            </FadeIn>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <FadeIn key={feature.title} delay={i * 0.1}>
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all h-full">
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 w-fit mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-24 md:py-32 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <FadeIn className="text-center mb-16">
              <p className="text-sm text-purple-400 font-medium tracking-wide uppercase mb-4">
                Use cases
              </p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Who uses AI Profiles
              </h2>
            </FadeIn>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  role: "Content Creators",
                  description:
                    "Let fans ask you anything, anytime. Your AI Profile handles hundreds of conversations while you focus on creating content.",
                  stat: "24/7 fan engagement",
                },
                {
                  role: "Consultants & Coaches",
                  description:
                    "Pre-qualify leads with your AI Profile. Prospects get immediate answers, and only serious inquiries reach your inbox.",
                  stat: "Automated lead qualification",
                },
                {
                  role: "Developers & OSS Maintainers",
                  description:
                    "Answer setup questions, explain architecture decisions, and guide contributors. Your AI Profile becomes your always-on documentation.",
                  stat: "Fewer repetitive support tickets",
                },
                {
                  role: "Founders & Thought Leaders",
                  description:
                    "Scale your personal brand. Your AI Profile shares your insights, philosophy, and expertise with everyone who asks.",
                  stat: "Global personal brand reach",
                },
              ].map((useCase, i) => (
                <FadeIn key={useCase.role} delay={i * 0.1}>
                  <div className="p-8 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all h-full">
                    <div className="text-xs text-purple-400 font-medium tracking-wide uppercase mb-3">
                      {useCase.stat}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {useCase.role}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {useCase.description}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl mx-auto">
            <FadeIn className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Questions & answers
              </h2>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border-b border-white/5"
                  >
                    <AccordionTrigger className="text-base md:text-lg hover:text-foreground hover:no-underline py-6 text-left [&>svg]:hidden [&[data-state=open]>.plus-icon]:rotate-45">
                      <span className="font-medium pr-4">{faq.question}</span>
                      <span className="plus-icon ml-auto text-xl text-muted-foreground transition-transform duration-200 flex-shrink-0">
                        +
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground pb-6 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </FadeIn>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <FadeIn>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Ready to let your
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  profile speak?
                </span>
              </h2>
            </FadeIn>

            <FadeIn delay={0.1}>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                Create your AI Profile in minutes. Connect your content, and
                start conversations that scale.
              </p>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-base px-8 h-12 gap-2" asChild>
                  <Link href="/signin">
                    Get started for free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5">
          {/* Desktop Footer */}
          <div className="hidden md:block">
            <div className="max-w-5xl mx-auto px-4 py-8">
              <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-sm text-muted-foreground">
                <Link
                  href="/terms-of-service"
                  className="hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/commerce-disclosure"
                  className="hover:text-foreground transition-colors"
                >
                  Commerce Disclosure
                </Link>
                <Link
                  href="/pricing"
                  className="hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                &copy; 2025 MentionAI. Made with love in Tokyo.
              </p>
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="md:hidden">
            <div className="px-6 py-8">
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-sm">
                <Link
                  href="/terms-of-service"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/commerce-disclosure"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Commerce Disclosure
                </Link>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                &copy; 2025 MentionAI. Made with love in Tokyo.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
