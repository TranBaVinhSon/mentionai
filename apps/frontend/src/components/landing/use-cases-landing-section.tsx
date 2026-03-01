"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  MessageSquare,
  Brain,
  Code,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { landingUseCaseImages } from "./use-case-images";

const fadeUpStagger = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.7,
      ease: [0.215, 0.61, 0.355, 1],
    },
  }),
};

const useCases = [
  {
    icon: <DollarSign className="h-5 w-5" />,
    subtitle: "For Creators",
    description: "Set your price. Share your profile. Get paid monthly.",
    image: landingUseCaseImages.monetization,
    gradient: "from-yellow-400 to-yellow-600",
    badge: "Coming Soon",
    targetAudience: "Creators, Instructors, Consultants",
    keyBenefit: "Monthly recurring income",
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "Always Available for Your Audience",
    subtitle: "For Content Creators",
    description: "Answer fan questions automatically.",
    image: landingUseCaseImages.creator,
    gradient: "from-purple-400 to-purple-600",
    badge: "Most Popular",
    targetAudience: "YouTubers, Newsletter Writers, Coaches",
    keyBenefit: "24/7 automated responses",
  },
  {
    icon: <Brain className="h-5 w-5" />,
    subtitle: "For Consultants",
    description: "Pre-qualify leads automatically. Close more deals.",
    image: landingUseCaseImages.consultant,
    gradient: "from-blue-400 to-blue-600",
    badge: "High ROI",
    targetAudience: "Coaches, Advisors, Agencies",
    keyBenefit: "Only qualified leads reach you",
  },
  {
    icon: <Code className="h-5 w-5" />,
    subtitle: "For Developers",
    description: "Answer setup questions instantly. Focus on coding.",
    image: landingUseCaseImages.developer,
    gradient: "from-green-400 to-green-600",
    badge: "Time Saver",
    targetAudience: "Open Source Maintainers, Technical Writers",
    keyBenefit: "95% fewer support tickets",
  },
  {
    icon: <Users className="h-5 w-5" />,
    subtitle: "For Small Teams",
    description:
      "Provide 24/7 support without hiring. Handle hundreds of questions.",
    image: landingUseCaseImages.team,
    gradient: "from-orange-400 to-orange-600",
    badge: "Scale Fast",
    targetAudience: "Startups, SaaS, Agencies",
    keyBenefit: "Enterprise support on startup budget",
  },
];

export function UseCasesLandingSection() {
  return (
    <section
      id="use-cases"
      className="relative py-24 px-4 sm:px-6 lg:px-8 z-10"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B] via-[#0A0A0B]/90 to-[#0A0A0B]"></div>
        <div className="absolute left-0 top-1/4 w-1/2 h-1/2 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute right-0 bottom-1/4 w-1/2 h-1/2 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <motion.div
        className="mx-auto max-w-7xl"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div
          custom={0}
          variants={fadeUpStagger}
          className="text-center mb-16"
        >
          <h2 className="text-[2rem] font-medium tracking-tight sm:text-[2.5rem] leading-[1.2]">
            How we use <span className="text-white">MentionAI</span>
          </h2>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 mb-12">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              custom={index + 2}
              variants={fadeUpStagger}
              className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm transition-all hover:border-white/10 hover:bg-white/5 hover:scale-[1.02] ${
                index === useCases.length - 1 && useCases.length % 2 !== 0
                  ? "md:col-span-2 md:max-w-[calc(50%-1rem)] md:mx-auto"
                  : ""
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="relative">
                {/* Badge */}
                <div className="absolute top-6 right-6 z-10">
                  <Badge
                    variant="outline"
                    className={`${
                      useCase.badge === "Coming Soon"
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 border-0 text-white"
                        : "border-white/20 bg-white/10 backdrop-blur-sm text-white/90"
                    } text-[10px] px-2 py-0.5`}
                  >
                    {useCase.badge === "Coming Soon" && (
                      <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    {useCase.badge}
                  </Badge>
                </div>

                {/* Image */}
                <div className="relative h-48 -m-[1px] mb-6 overflow-hidden rounded-t-2xl">
                  <Image
                    src={useCase.image}
                    alt={useCase.subtitle}
                    fill
                    className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/50 to-transparent" />
                </div>

                <div className="p-8 pt-0">
                  <p className="text-[14px] text-purple-300/80 mb-4">
                    {useCase.subtitle}
                  </p>

                  <p className="text-[15px] text-white/80 mb-4 leading-relaxed">
                    {useCase.description}
                  </p>

                  <p className="text-[13px] text-white/60 mb-4">
                    {useCase.targetAudience}
                  </p>

                  <div className="border-t border-white/10 pt-4 mt-4">
                    <p className="text-[14px] text-orange-300/90 font-medium mb-3">
                      {useCase.keyBenefit}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          custom={7}
          variants={fadeUpStagger}
          className="text-center space-y-6"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="default"
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground group"
              onClick={() => (window.location.href = "/apps/new?me=true")}
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
