"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import Autoplay from "embla-carousel-autoplay";
import {
  BarChart3,
  Clock,
  Instagram,
  Share2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";

import heroBanner from "../../../public/images/landing-page/hero-banner.png";
import createCloneGif from "../../../public/images/landing-page/creat-clone.gif";
import digitalCloneChatGif from "../../../public/images/landing-page/digital-clone-chat.gif";
import earthImage from "../../../public/images/landing-page/earth.png";
import communityGif from "../../../public/images/landing-page/community.gif";
import bestMatchImage from "../../../public/images/landing-page/best-match.png";
import mentionAiBanner from "../../../public/images/brands/mention_ai_banner.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FlipWords } from "@/components/ui/shadcn-io/flip-words";
import { SlidingNumber } from "@/components/ui/shadcn-io/sliding-number";
import { TextGenerateEffect } from "@/components/ui/shadcn-io/text-generate-effect";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "motion/react";
import { useInView } from "motion/react";

// Avatar imports
import annieAvatar from "../../../public/avatars/annie.png";
import gagandtAvatar from "../../../public/avatars/gagandt.jpeg";
import kienAvatar from "../../../public/avatars/kien.jpeg";
import minhAvatar from "../../../public/avatars/minh.jpeg";
import sonAvatar from "../../../public/avatars/son.jpeg";
import truongAvatar from "../../../public/avatars/truong.png";

// Avatar array to avoid duplicates
const avatarImages = [
  { src: annieAvatar, alt: "Album 1" },
  { src: gagandtAvatar, alt: "Album 2" },
  { src: kienAvatar, alt: "Album 3" },
  { src: minhAvatar, alt: "Album 4" },
  { src: sonAvatar, alt: "Album 5" },
  { src: truongAvatar, alt: "Album 6" },
];
// Split into two rows for two independent carousels
const midpoint = Math.ceil(avatarImages.length / 2);
const topRowImages = avatarImages.slice(0, midpoint);
const bottomRowImages = avatarImages.slice(midpoint);

// Animation wrapper component for scroll animations
function AnimateOnScroll({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{
        duration: 0.6,
        delay,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Colorful flip words component
function ColorfulFlipWords() {
  const wordConfigs = [
    { word: "fun", gradient: "from-blue-500 to-cyan-500" },
    { word: "better", gradient: "from-purple-500 to-pink-500" },
    { word: "new", gradient: "from-green-500 to-emerald-500" },
    { word: "smart", gradient: "from-orange-500 to-red-500" },
  ];

  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Create a stable words array
  const words = React.useMemo(
    () => wordConfigs.map((config) => config.word),
    []
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % wordConfigs.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [wordConfigs.length]);

  const currentConfig = wordConfigs[currentIndex];

  return (
    <span className="relative inline-block">
      <span
        className={`absolute inset-0 bg-gradient-to-r ${currentConfig.gradient} rounded-lg transition-all duration-500`}
      />
      <span className="relative px-3 py-1 text-white font-bold">
        <FlipWords
          words={words}
          duration={3000}
          letterDelay={0.2}
          wordDelay={0.2}
        />
      </span>
    </span>
  );
}

// Audience flip words component
function AudienceFlipWords() {
  const audienceConfigs = [
    { audience: "your fans", gradient: "from-pink-500 to-rose-500" },
    { audience: "influencers", gradient: "from-violet-500 to-purple-500" },
    { audience: "CTOs", gradient: "from-blue-500 to-indigo-500" },
    { audience: "coaches", gradient: "from-emerald-500 to-green-500" },
    { audience: "creators", gradient: "from-orange-500 to-amber-500" },
  ];

  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Create a stable words array
  const words = React.useMemo(
    () => audienceConfigs.map((config) => config.audience),
    []
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % audienceConfigs.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [audienceConfigs.length]);

  const currentConfig = audienceConfigs[currentIndex];

  return (
    <span className="relative inline-block">
      <span
        className={`absolute inset-0 bg-gradient-to-r ${currentConfig.gradient} rounded-lg transition-all duration-500`}
      />
      <span className="relative px-3 py-1 text-white font-bold">
        <FlipWords
          words={words}
          duration={3000}
          letterDelay={0.2}
          wordDelay={0.2}
        />
      </span>
    </span>
  );
}

// Animated Accuracy Number component
function AnimatedAccuracyNumber() {
  const [displayNumber, setDisplayNumber] = React.useState(0);

  React.useEffect(() => {
    // Initial animation
    const initialTimeout = setTimeout(() => {
      setDisplayNumber(95);
    }, 100);

    // Repeat animation every 3 seconds
    const interval = setInterval(() => {
      setDisplayNumber(0);
      setTimeout(() => {
        setDisplayNumber(95);
      }, 100);
    }, 3000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center">
        <div className="text-8xl font-bold text-brand">
          <SlidingNumber
            number={displayNumber}
            inView={true}
            transition={{
              stiffness: 150,
              damping: 20,
              mass: 0.8,
            }}
          />
        </div>
        <span className="text-8xl font-bold text-brand">%</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="relative">
      {/* Add padding to account for fixed header */}
      <div className="pt-16">
        <div className="flex gap-4 justify-center flex-col items-center px-10  py-4">
          <AnimateOnScroll>
            <Image
              width={450}
              style={{ objectFit: "contain" }}
              src={heroBanner}
              alt="MentionAI"
              fetchPriority="high"
              objectFit="scale-down"
            />
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.2}>
            <h1 className="text-5xl md:text-6xl font-bold text-center leading-tight">
              A <ColorfulFlipWords /> way to talk with <AudienceFlipWords />.
            </h1>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.4}>
            <p className="text-muted-foreground text-xl md:text-2xl text-center max-w-4xl">
              MentionAI is a social AI platform that makes it easy to create
              your digital clone, train it on your content, and let it interact
              with your community 24/7.
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.6}>
            <div className="flex justify-center">
              <Button size="lg">Create a free account now</Button>
            </div>
          </AnimateOnScroll>
        </div>

        {/* Quick Primer Section */}
        <div className="w-full max-w-6xl mx-auto px-4 py-16">
          <AnimateOnScroll className="text-center mb-8">
            <ChevronDownIcon className="w-6 h-6 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl md:text-3xl font-medium">
              Here's a quick primer...
            </h2>
          </AnimateOnScroll>

          {/* Mobile Layout - Carousels on top, Cards below */}
          <div className="flex flex-col gap-3 md:gap-6 lg:hidden">
            {/* First Carousel */}
            <AnimateOnScroll delay={0.1}>
              <Carousel
                opts={{ align: "start", loop: true }}
                plugins={[Autoplay({ delay: 2000, stopOnInteraction: false })]}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {topRowImages.map((avatar, index) => (
                    <CarouselItem
                      key={`top-${index}`}
                      className="pl-2 md:pl-4 basis-1/2"
                    >
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                        <Image
                          src={avatar.src}
                          alt={avatar.alt}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full flex items-center">
                            <TrendingUp className="size-3 mr-1" />
                            Popular in this week
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </AnimateOnScroll>

            {/* Second Carousel */}
            <AnimateOnScroll delay={0.2}>
              <Carousel
                opts={{ align: "start", loop: true }}
                plugins={[Autoplay({ delay: 2500, stopOnInteraction: false })]}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {bottomRowImages.map((avatar, index) => (
                    <CarouselItem
                      key={`bottom-${index}`}
                      className="pl-2 md:pl-4 basis-1/2"
                    >
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <Image
                          src={avatar.src}
                          alt={avatar.alt}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </AnimateOnScroll>

            {/* Cards Grid */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <AnimateOnScroll delay={0.3}>
                <Card className="bg-muted border-0 flex flex-col h-full">
                  <CardHeader className="p-3 md:p-6 pb-3">
                    <div className="flex items-center space-x-3">
                      <Users className="size-6 md:size-8" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 md:p-6 pt-0 md:pt-0">
                    <CardTitle className="text-base md:text-lg font-semibold mb-2">
                      Social media integration
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base leading-relaxed">
                      Connect social profiles to train your AI.
                      <div className="flex items-center -space-x-2 mt-3">
                        <Avatar className="size-6 border-2 border-background">
                          <AvatarImage src="/icons/linkedin.svg" />
                          <AvatarFallback>LI</AvatarFallback>
                        </Avatar>
                        <Avatar className="size-6 border-2 border-background">
                          <AvatarImage src="/icons/reddit.svg" />
                          <AvatarFallback>R</AvatarFallback>
                        </Avatar>
                        <Avatar className="size-6 border-2 border-background">
                          <AvatarImage src="/icons/medium.svg" />
                          <AvatarFallback>M</AvatarFallback>
                        </Avatar>
                        <Avatar className="size-6 border-2 border-background">
                          <AvatarImage src="/icons/github.svg" />
                          <AvatarFallback>GH</AvatarFallback>
                        </Avatar>
                      </div>
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimateOnScroll>

              <AnimateOnScroll delay={0.4}>
                <Card className="bg-muted border-0 flex flex-col h-full">
                  <CardHeader className="p-3 md:p-6 pb-3">
                    <div className="flex items-center space-x-3">
                      <Share2 className="size-6 md:size-8" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 md:p-6 pt-0 md:pt-0">
                    <CardTitle className="text-base md:text-lg font-semibold mb-2">
                      Quick publish and share
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base leading-relaxed">
                      Get your unique URL and share instantly.
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimateOnScroll>

              <AnimateOnScroll delay={0.5}>
                <Card className="bg-muted border-0 flex flex-col h-full">
                  <CardHeader className="p-3 md:p-6 pb-3">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="size-6 md:size-8 text-green-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 md:p-6 pt-0 md:pt-0">
                    <CardTitle className="text-base md:text-lg font-semibold mb-2">
                      Tracking your customer
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base leading-relaxed">
                      Track engagement and analytics in real-time.
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimateOnScroll>

              <AnimateOnScroll delay={0.6}>
                <Card className="bg-muted border-0 flex flex-col h-full">
                  <CardHeader className="p-3 md:p-6 pb-3">
                    <div className="flex items-center space-x-3">
                      <Clock className="size-6 md:size-8 text-orange-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 md:p-6 pt-0 md:pt-0">
                    <CardTitle className="text-base md:text-lg font-semibold mb-2">
                      Saving your time
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base leading-relaxed">
                      Communication without presence.
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimateOnScroll>
            </div>
          </div>

          {/* Desktop Layout - Grid */}
          <div
            className="hidden lg:grid lg:grid-cols-2 lg:grid-rows-2 gap-3 md:gap-6"
            style={{ gridTemplateRows: "repeat(2, minmax(200px, 1fr))" }}
          >
            {/* Top Left - Carousel */}
            <AnimateOnScroll delay={0.1} className="lg:row-span-1">
              <div className="h-full">
                <Carousel
                  opts={{ align: "start", loop: true }}
                  plugins={[
                    Autoplay({ delay: 2000, stopOnInteraction: false }),
                  ]}
                  className="w-full h-full [&_>div]:h-full  [&_>div>div]:h-full"
                >
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {topRowImages.map((avatar, index) => (
                      <CarouselItem
                        key={`top-${index}`}
                        className="pl-2 md:pl-4 basis-1/2 lg:basis-2/5"
                      >
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden relative h-full">
                          <Image
                            src={avatar.src}
                            alt={avatar.alt}
                            className="w-full h-full object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full flex items-center">
                              <TrendingUp className="size-3 mr-1" />
                              Popular in this week
                            </div>
                          )}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            </AnimateOnScroll>

            {/* Top Right - Cards Grid */}
            <div className="lg:row-span-1 grid grid-cols-2 gap-3 md:gap-6">
              <AnimateOnScroll delay={0.2}>
                <Card className="bg-muted border-0 flex flex-col h-full">
                  <CardHeader className="p-3 md:p-6 pb-3">
                    <div className="flex items-center space-x-3">
                      <Users className="size-6 md:size-8" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 md:p-6 pt-0 md:pt-0">
                    <CardTitle className="text-base md:text-lg font-semibold mb-2">
                      Social media integration
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base leading-relaxed">
                      Connect social profiles to train your AI.
                      <div className="flex items-center -space-x-2 mt-3">
                        <Avatar className="size-6 border-2 border-background">
                          <AvatarImage src="/icons/linkedin.svg" />
                          <AvatarFallback>LI</AvatarFallback>
                        </Avatar>
                        <Avatar className="size-6 border-2 border-background">
                          <AvatarImage src="/icons/reddit.svg" />
                          <AvatarFallback>R</AvatarFallback>
                        </Avatar>
                        <Avatar className="size-6 border-2 border-background">
                          <AvatarImage src="/icons/medium.svg" />
                          <AvatarFallback>M</AvatarFallback>
                        </Avatar>
                        <Avatar className="size-6 border-2 border-background">
                          <AvatarImage src="/icons/github.svg" />
                          <AvatarFallback>GH</AvatarFallback>
                        </Avatar>
                      </div>
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimateOnScroll>

              <AnimateOnScroll delay={0.3} className="h-full">
                <Card className="bg-muted border-0 flex flex-col h-full">
                  <CardHeader className="p-3 md:p-6 pb-3">
                    <div className="flex items-center space-x-3">
                      <Share2 className="size-6 md:size-8" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 md:p-6 pt-0 md:pt-0">
                    <CardTitle className="text-base md:text-lg font-semibold mb-2">
                      Quick publish and share
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base leading-relaxed">
                      Get your unique URL and share instantly.
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimateOnScroll>
            </div>

            {/* Bottom Left - Carousel */}
            <AnimateOnScroll delay={0.4} className="lg:row-span-1">
              <div className="h-full">
                <Carousel
                  opts={{ align: "start", loop: true }}
                  plugins={[
                    Autoplay({ delay: 2000, stopOnInteraction: false }),
                  ]}
                  className="w-full h-full [&_>div]:h-full  [&_>div>div]:h-full"
                >
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {bottomRowImages.map((avatar, index) => (
                      <CarouselItem
                        key={`bottom-${index}`}
                        className="pl-2 md:pl-4 basis-1/2 lg:basis-2/5"
                      >
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden h-full">
                          <Image
                            src={avatar.src}
                            alt={avatar.alt}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            </AnimateOnScroll>

            {/* Bottom Right - Cards Grid */}
            <div className="lg:row-span-1 grid grid-cols-2 gap-3 md:gap-6">
              <AnimateOnScroll delay={0.5} className="h-full">
                <Card className="bg-muted border-0 flex flex-col h-full">
                  <CardHeader className="p-3 md:p-6 pb-3">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="size-6 md:size-8 text-green-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 md:p-6 pt-0 md:pt-0">
                    <CardTitle className="text-base md:text-lg font-semibold mb-2">
                      Tracking your customer
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base leading-relaxed">
                      Track engagement and analytics in real-time.
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimateOnScroll>

              <AnimateOnScroll delay={0.6} className="h-full">
                <Card className="bg-muted border-0 flex flex-col h-full">
                  <CardHeader className="p-3 md:p-6 pb-3">
                    <div className="flex items-center space-x-3">
                      <Clock className="size-6 md:size-8 text-orange-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 md:p-6 pt-0 md:pt-0">
                    <CardTitle className="text-base md:text-lg font-semibold mb-2">
                      Saving your time
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base leading-relaxed">
                      Communication without presence.
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimateOnScroll>
            </div>
          </div>
        </div>

        {/* Designed for ease of use Section */}
        <div className="w-full max-w-7xl mx-auto px-4 py-24 relative">
          <AnimateOnScroll className="mb-16">
            <h2 className="text-5xl md:text-6xl font-bold max-w-4xl font-montserrat">
              Designed for the best value.
            </h2>
          </AnimateOnScroll>

          <div className="grid lg:grid-cols-2 gap-16 lg:grid-rows-[auto_auto] relative">
            {/* Discover & organize */}
            <AnimateOnScroll
              delay={0.2}
              className="grid grid-rows-subgrid row-span-2 gap-8"
            >
              <div className="relative rounded-2xl overflow-hidden bg-muted/50">
                <Image
                  src={createCloneGif}
                  alt="Discover and organize"
                  width={600}
                  height={400}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">
                  Connect & train your digital self
                </h3>
                <p className="text-lg text-muted-foreground">
                  Link your social media accounts and we'll aggregate years of
                  your posts, comments, and interactions. Your digital clone
                  learns from your authentic voice, becoming a true extension of
                  who you are online.
                </p>
              </div>
            </AnimateOnScroll>

            {/* Set your listening status */}
            <AnimateOnScroll
              delay={0.4}
              className="grid grid-rows-subgrid row-span-2 gap-8 relative"
            >
              <div className="relative rounded-2xl overflow-hidden bg-muted/50">
                <Image
                  src={digitalCloneChatGif}
                  alt="Set your listening status"
                  width={600}
                  height={400}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">
                  Go live & engage 24/7
                </h3>
                <p className="text-lg text-muted-foreground">
                  Share your unique URL and let fans chat with your AI anytime.
                  While you sleep, work, or create, your digital clone keeps the
                  conversation going—answering questions, sharing insights, and
                  building deeper connections with your audience.
                </p>
              </div>{" "}
              {/* Earth image - absolute positioned */}
              <div className="absolute -top-14 right-0 z-10 pointer-events-none">
                <Image
                  src={earthImage}
                  alt="Earth"
                  width={150}
                  height={150}
                  className="object-contain"
                />
              </div>
            </AnimateOnScroll>
          </div>
        </div>

        {/* A one-of-a-kind AI social platform Section */}
        <div className="w-full max-w-7xl mx-auto px-4 py-24">
          <AnimateOnScroll className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold">
              A one-of-a-kind AI social platform.
            </h2>
          </AnimateOnScroll>

          <div className="grid lg:grid-cols-3 gap-8 lg:grid-rows-[auto_auto_auto_1fr] items-start">
            {/* Browse influential creators */}
            <AnimateOnScroll
              delay={0.2}
              className="grid grid-rows-subgrid row-span-4 gap-0"
            >
              <div className="h-80 rounded-2xl overflow-hidden mb-6">
                <Image
                  src={communityGif}
                  alt="Community of micro influencers"
                  width={500}
                  height={400}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <TextGenerateEffect
                words="Browse influential creators"
                className="text-2xl mb-3"
                duration={0.5}
                staggerDelay={0.1}
              />
              <TextGenerateEffect
                words="Discover and connect with micro influencers across different niches. Our platform aggregates thousands of verified creators, helping you build meaningful partnerships that align with your brand values and audience."
                className="text-lg text-muted-foreground font-normal"
                duration={0.3}
                staggerDelay={0.05}
              />
              <div /> {/* Empty div for spacing */}
            </AnimateOnScroll>

            {/* Unmatched AI accuracy */}
            <AnimateOnScroll
              delay={0.3}
              className="grid grid-rows-subgrid row-span-4 gap-0"
            >
              <div className="h-80 mb-6 flex flex-col justify-center items-center">
                {/* AI Accuracy Animation */}
                <AnimatedAccuracyNumber />
              </div>
              <TextGenerateEffect
                words="Unmatched AI accuracy"
                className="text-2xl mb-3"
                duration={0.5}
                staggerDelay={0.1}
              />
              <TextGenerateEffect
                words="Our AI technology achieves 95% accuracy in replicating your communication style. Advanced machine learning analyzes your content patterns, ensuring your digital clone responds authentically and maintains your unique voice across all interactions."
                className="text-lg text-muted-foreground font-normal"
                duration={0.3}
                staggerDelay={0.05}
              />
            </AnimateOnScroll>

            {/* Perfect audience matching */}
            <AnimateOnScroll
              delay={0.4}
              className="grid grid-rows-subgrid row-span-4 gap-0"
            >
              <div className="h-80 rounded-2xl overflow-hidden mb-6">
                <Image
                  src={bestMatchImage}
                  alt="Best audience match"
                  width={500}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>
              <TextGenerateEffect
                words="Perfect audience matching"
                className="text-2xl mb-3"
                duration={0.5}
                staggerDelay={0.1}
              />
              <TextGenerateEffect
                words="Smart algorithms analyze engagement patterns and audience demographics to match you with fans who genuinely connect with your content. Build lasting relationships with people who share your interests and values."
                className="text-lg text-muted-foreground font-normal"
                duration={0.3}
                staggerDelay={0.05}
              />
            </AnimateOnScroll>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="w-full max-w-4xl mx-auto px-4 py-24">
          <AnimateOnScroll className="text-center mb-16">
            <div className="flex justify-center items-center mb-8">
              <div className="text-6xl">↓</div>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold">
              Questions? We've got answers.
            </h2>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.2}>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b">
                <AccordionTrigger className="text-lg hover:text-primary hover:no-underline py-6 [&>svg]:hidden [&[data-state=open]>.plus-icon]:rotate-45">
                  <span className="font-medium">
                    Do I need to create an account to use MentionAI?
                  </span>
                  <span className="plus-icon ml-auto text-2xl text-muted-foreground transition-transform duration-200">
                    +
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-lg text-muted-foreground pb-6">
                  Yes, you'll need to create a free account to get started. This
                  allows us to save your digital clone's training data and
                  provide you with a unique URL (mentionai.io/@yourname) where
                  people can interact with your AI.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b">
                <AccordionTrigger className="text-lg hover:text-primary hover:no-underline py-6 [&>svg]:hidden [&[data-state=open]>.plus-icon]:rotate-45">
                  <span className="font-medium">
                    Does it cost anything to create a digital clone?
                  </span>
                  <span className="plus-icon ml-auto text-2xl text-muted-foreground transition-transform duration-200">
                    +
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-lg text-muted-foreground pb-6">
                  Creating a basic digital clone is free! We offer a free tier
                  that includes essential features. For advanced features like
                  analytics, priority processing, and unlimited interactions, we
                  offer MentionAI Plus starting at $9.99/month.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-b">
                <AccordionTrigger className="text-lg hover:text-primary hover:no-underline py-6 [&>svg]:hidden [&[data-state=open]>.plus-icon]:rotate-45">
                  <span className="font-medium">
                    Can I import my data from other social platforms?
                  </span>
                  <span className="plus-icon ml-auto text-2xl text-muted-foreground transition-transform duration-200">
                    +
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-lg text-muted-foreground pb-6">
                  Absolutely! We support direct imports from LinkedIn, Reddit,
                  Medium, GitHub, Twitter, Substack, and Goodreads. You can also
                  add blog posts and YouTube videos. Simply connect your
                  accounts and we'll aggregate your content to train your AI
                  clone.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-b">
                <AccordionTrigger className="text-lg hover:text-primary hover:no-underline py-6 [&>svg]:hidden [&[data-state=open]>.plus-icon]:rotate-45">
                  <span className="font-medium">
                    Can my digital clone interact on multiple platforms?
                  </span>
                  <span className="plus-icon ml-auto text-2xl text-muted-foreground transition-transform duration-200">
                    +
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-lg text-muted-foreground pb-6">
                  Currently, your digital clone lives on your unique MentionAI
                  URL where anyone can chat with it. We're working on
                  integrations that will allow your clone to respond on other
                  platforms directly. Stay tuned for updates!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-b">
                <AccordionTrigger className="text-lg hover:text-primary hover:no-underline py-6 [&>svg]:hidden [&[data-state=open]>.plus-icon]:rotate-45">
                  <span className="font-medium">
                    How accurate is the AI in replicating my style?
                  </span>
                  <span className="plus-icon ml-auto text-2xl text-muted-foreground transition-transform duration-200">
                    +
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-lg text-muted-foreground pb-6">
                  Our AI achieves 95% accuracy in replicating communication
                  styles. The more content you provide from your social media
                  posts, comments, and interactions, the better your digital
                  clone becomes at mimicking your unique voice, tone, and
                  expertise.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AnimateOnScroll>
        </div>

        {/* CTA Section - Join the platform today */}
        <div className="w-full py-24 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <AnimateOnScroll className="mb-12">
              <Image
                src={mentionAiBanner}
                alt="MentionAI Characters"
                width={700}
                height={400}
                className="mx-auto object-contain"
              />
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.2}>
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                Join the platform today.
              </h2>
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.3}>
              <p className="text-xl text-muted-foreground mb-12">
                Sign up now and start creating, training, and connecting with
                your digital clone.
              </p>
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-lg px-8" asChild>
                  <Link href="/signin">Get started - it's free!</Link>
                </Button>
                {/* <Button size="lg" variant="outline" className="text-lg px-8">
                  Learn more →
                </Button> */}
              </div>
            </AnimateOnScroll>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full border-t bg-background">
          {/* Desktop Footer */}
          <div className="hidden md:block">
            {/* <div className="max-w-7xl mx-auto px-4 py-16"> */}
            {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                Browse
                <div>
                  <h4 className="text-lg font-semibold mb-4">Browse</h4>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href="/explore"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors"
                      >
                        Explore
                      </Link>
                    </li>
                  </ul>
                </div>
                Information
                <div>
                  <h4 className="text-lg font-semibold mb-4">Information</h4>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href="/about"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors"
                      >
                        About
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/faq"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors"
                      >
                        FAQ
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/blog"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors"
                      >
                        Blog
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/contact"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors"
                      >
                        Contact
                      </Link>
                    </li>
                  </ul>
                </div>
                Community
                <div>
                  <h4 className="text-lg font-semibold mb-4">Community</h4>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href="/users"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors"
                      >
                        Users
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/reviews"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors"
                      >
                        Reviews
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/lists"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors"
                      >
                        Lists
                      </Link>
                    </li>
                  </ul>
                </div>
                Follow us
                <div>
                  <h4 className="text-lg font-semibold mb-4">Follow us</h4>
                  <ul className="space-y-2">
                    <li>
                      <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors inline-flex items-center gap-2"
                      >
                        <Instagram className="size-5" /> Instagram
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://twitter.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg text-muted-foreground hover:text-brand transition-colors inline-flex items-center gap-2"
                      >
                        <X className="size-5" /> Twitter
                      </a>
                    </li>
                  </ul>
                </div>
              </div> */}

            {/* Bottom Footer - Desktop */}
            <div className="mt-12 pt-8 border-border">
              <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-lg text-muted-foreground">
                <Link
                  href="/terms-of-service"
                  className="hover:text-brand transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-brand transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/commerce-disclosure"
                  className="hover:text-brand transition-colors"
                >
                  Commerce Disclosure
                </Link>
                <Link
                  href="/pricing"
                  className="hover:text-brand transition-colors"
                >
                  Pricing
                </Link>
              </div>
              <p className="text-center text-lg text-muted-foreground mt-4">
                © 2025 MentionAI. Made with ❤️ in Tokyo.
              </p>
              {/* </div> */}
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="md:hidden bg-muted/30">
            <div className="px-6 py-12">
              <div className="grid grid-cols-2 gap-12 mb-16">
                {/* Left Column */}
                <div className="space-y-8">
                  {/* Browse */}
                  {/* <div>
                    <h4 className="text-xl font-semibold mb-4">Browse</h4>
                    <ul className="space-y-3">
                      <li>
                        <Link
                          href="/releases"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          Releases
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/artists"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          Artists
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/labels"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          Labels
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/genres"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          Genres
                        </Link>
                      </li>
                    </ul>
                  </div> */}

                  {/* Information */}
                  {/* <div>
                    <h4 className="text-xl font-semibold mb-4">Information</h4>
                    <ul className="space-y-3">
                      <li>
                        <Link
                          href="/about"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          About
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/faq"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          FAQ
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/blog"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          Blog
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/contact"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          Contact
                        </Link>
                      </li>
                    </ul>
                  </div> */}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Community */}
                  {/* <div>
                    <h4 className="text-xl font-semibold mb-4">Community</h4>
                    <ul className="space-y-3">
                      <li>
                        <Link
                          href="/users"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          Users
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/reviews"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          Reviews
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/lists"
                          className="text-base text-muted-foreground hover:text-brand transition-colors"
                        >
                          Lists
                        </Link>
                      </li>
                    </ul>
                  </div> */}

                  {/* Follow us */}
                  <div>
                    <h4 className="text-xl font-semibold mb-4">Follow us</h4>
                    <ul className="space-y-3">
                      {/* <li>
                        <a
                          href="https://instagram.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base text-muted-foreground hover:text-brand transition-colors inline-flex items-center gap-2"
                        >
                          <Instagram className="size-5" /> Instagram
                        </a>
                      </li> */}
                      <li>
                        <a
                          href="https://twitter.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base text-muted-foreground hover:text-brand transition-colors inline-flex items-center gap-2"
                        >
                          <X className="size-5" /> Twitter
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bottom Links */}
              <div className="border-border pt-8">
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-sm">
                  <Link
                    href="/terms-of-service"
                    className="text-muted-foreground hover:text-brand transition-colors"
                  >
                    Terms of Service
                  </Link>
                  <Link
                    href="/privacy"
                    className="text-muted-foreground hover:text-brand transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/commerce-disclosure"
                    className="text-muted-foreground hover:text-brand transition-colors"
                  >
                    Commerce Disclosure
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-muted-foreground hover:text-brand transition-colors"
                  >
                    Pricing
                  </Link>
                </div>

                {/* Copyright */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    © 2025 MentionAI. Made with ❤️ in Tokyo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
