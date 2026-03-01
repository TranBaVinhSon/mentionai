"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  ChevronRight,
  Sparkles,
  Star,
  Zap,
  Search,
  Bot,
  Terminal,
  Code,
  FileText,
  Layers,
  ArrowRight,
  Rocket,
  Lightbulb,
  AtSign,
  ArrowUpRight,
  X,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ToolsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const router = useRouter();


  useEffect(() => {
    setIsMounted(true);

    const timer = setTimeout(() => {
      setShowFloatingCTA(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (scrollPosition > 500) {
        setShowFloatingCTA(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const tools = [
    {
      id: "llm-comparison",
      name: "LLM Benchmark Comparison",
      description:
        "Compare performance metrics across leading large language models. Analyze benchmarks, capabilities, and pricing in an interactive dashboard.",
      icon: BarChart3,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50",
      category: "Analysis",
      isNew: true,
      path: "/tools/llm-comparison",
      benefits: [
        "Compare 20+ LLMs",
        "Interactive visualizations",
        "Up-to-date benchmarks",
      ],
    },
    {
      id: "llm-price-prediction",
      name: "LLM Price Prediction",
      description:
        "Estimate API costs for various LLMs based on token usage, word count, or character count, and the number of API calls.",
      icon: DollarSign,
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      category: "Analysis",
      isNew: true,
      path: "/tools/llm-price-prediction",
      benefits: [
        "Estimate costs accurately",
        "Supports tokens, words, chars",
        "Factor in API call costs",
      ],
    },
    // Future tools will be added here
  ];

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
      {/* Hero Section - Simplified */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 sm:p-12 mb-16 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-6 w-6 text-primary/80" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
              MentionAI Tools
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Supercharge Your <span className="text-primary">Workflow</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-3xl mb-8">
            Access specialized AI tools designed to boost productivity, analyze
            data, and generate insights – all with the power of cutting-edge AI
            models.
          </p>

          <div className="flex flex-wrap gap-4 items-center mb-8">
            <Button
              size="lg"
              onClick={() => router.push("/")}
              className="shadow-md hover:shadow-lg transition-all transform hover:scale-105 group"
            >
              <span className="flex items-center gap-2">
                Experience Full Platform
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
            <p className="text-muted-foreground text-sm">
              These tools are just a{" "}
              <span className="text-foreground font-medium">small preview</span>{" "}
              of what MentionAI can do
            </p>
          </div>

          <div className="relative max-w-lg">
            <Input
              className="py-6 pl-12 pr-4 rounded-xl border-border focus-visible:ring-primary"
              placeholder="Search for tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </motion.div>
      </div>

      {/* Premium Banner - Simplified */}
      <AnimatePresence>
        {showPremiumBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative mb-16 p-6 rounded-2xl bg-primary/5 shadow-md overflow-hidden border border-primary/10"
          >
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setShowPremiumBanner(false)}
                className="text-primary/60 hover:text-primary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <AtSign className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="text-foreground text-xl md:text-2xl font-bold mb-2">
                  Unlock the Full Power of MentionAI
                </h3>
                <p className="text-muted-foreground mb-4 max-w-2xl">
                  These standalone tools are just the beginning. With MentionAI,
                  you can combine models, run complex workflows, and generate
                  content with unprecedented quality and speed.
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {["@gpt-4o", "@claude-3-7-sonnet", "@gemini-pro", "@flux-1"].map(
                    (model, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-muted rounded-md text-sm text-muted-foreground font-mono"
                      >
                        {model}
                      </span>
                    )
                  )}
                  <span className="px-2.5 py-1 bg-muted rounded-md text-sm text-muted-foreground font-mono">
                    +12 more
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                <Button
                  size="lg"
                  onClick={() => router.push("/")}
                  variant="secondary"
                  className="whitespace-nowrap group"
                >
                  <span className="flex items-center gap-2">
                    Try MentionAI
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Section - Simplified */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-8">Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { name: "Analysis", icon: BarChart3, iconColor: "text-purple-600" },
            { name: "Generation", icon: Sparkles, iconColor: "text-blue-600" },
            { name: "Conversion", icon: Layers, iconColor: "text-green-600" },
            { name: "Coding", icon: Terminal, iconColor: "text-amber-600" },
            {
              name: "Summarization",
              icon: FileText,
              iconColor: "text-rose-600",
            },
            { name: "Chat", icon: Bot, iconColor: "text-cyan-600" },
          ].map((category, index) => (
            <motion.button
              key={category.name}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl bg-muted hover:bg-muted/80 transition-all",
                category.iconColor
              )}
              whileHover={{ scale: 1.03 }}
              onClick={() => setSearchTerm(category.name)}
              custom={index}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
            >
              <category.icon className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium text-muted-foreground">
                {category.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Available Tools - Simplified */}
      <div>
        <h2 className="text-2xl font-semibold mb-8">Available Tools</h2>

        {filteredTools.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">
              No tools match your search criteria
            </p>
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool, index) => (
              <motion.div
                key={tool.id}
                custom={index}
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <Link href={tool.path} className="block h-full">
                  <Card className="h-full overflow-hidden hover:shadow-lg transition-all cursor-pointer group border border-border hover:border-primary/30">
                    <div className={`p-6 relative overflow-hidden bg-card`}>
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`p-2.5 rounded-xl ${tool.bgColor} ${tool.iconColor}`}
                        >
                          <tool.icon className="h-5 w-5" />
                        </div>

                        {tool.isNew && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shadow">
                            <Zap className="h-3 w-3 mr-1" />
                            NEW
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                        {tool.name}
                      </h3>

                      <p className="text-sm text-muted-foreground mb-4">
                        {tool.description}
                      </p>

                      <div className="space-y-2 mb-5">
                        {tool.benefits.map((benefit, i) => (
                          <div
                            key={i}
                            className="flex items-center text-sm text-muted-foreground"
                          >
                            <Star className="h-3.5 w-3.5 text-yellow-500 mr-2 flex-shrink-0" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
                        Try it now
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Full Platform Feature Showcase - Simplified */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="my-16 p-6 md:p-10 rounded-2xl bg-card shadow-md border border-border"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-muted">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              Amplify Your Experience with the Full Platform
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-start">
              <div className="p-3 mb-4 rounded-full bg-muted">
                <AtSign className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">
                20+ AI Models in One Interface
              </h3>
              <p className="text-muted-foreground mb-4">
                Access GPT-4o, Claude 3, Gemini Pro, and many more with a simple
                @mention. No more switching platforms.
              </p>
              <Button
                variant="link"
                onClick={() => router.push("/")}
                className="group p-0 h-auto text-primary hover:text-primary/90"
              >
                <span className="flex items-center">
                  Explore Models
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </div>

            <div className="flex flex-col items-start">
              <div className="p-3 mb-4 rounded-full bg-muted">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">
                Custom AI Applications
              </h3>
              <p className="text-muted-foreground mb-4">
                Create specialized AI agents with custom instructions for any
                workflow or use case, automating your most common tasks.
              </p>
              <Button
                variant="link"
                onClick={() => router.push("/")}
                className="group p-0 h-auto text-primary hover:text-primary/90"
              >
                <span className="flex items-center">
                  Build Apps
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </div>

            <div className="flex flex-col items-start">
              <div className="p-3 mb-4 rounded-full bg-muted">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">
                Multi-Model Collaboration
              </h3>
              <p className="text-muted-foreground mb-4">
                Combine strengths of different AI models in a single prompt.
                Text, images, code, and reasoning in one conversation.
              </p>
              <Button
                variant="link"
                onClick={() => router.push("/")}
                className="group p-0 h-auto text-primary hover:text-primary/90"
              >
                <span className="flex items-center">
                  Try Collaboration
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground mb-4 md:mb-0 text-center md:text-left max-w-lg">
              These tools provide specific functionality, but the full MentionAI
              platform offers a completely integrated experience with all models
              working together.
            </p>
            <Button
              className="shadow-md hover:shadow-lg transition-all transform hover:scale-105"
              size="lg"
              onClick={() => router.push("/")}
            >
              <span className="flex items-center gap-2">
                Experience Full Platform
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Button>
          </div>
        </motion.div>

        {/* Coming Soon Section - Simplified */}
        <div className="mt-16">
          <div className="flex items-center gap-2 mb-8">
            <Code className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-2xl font-semibold text-foreground">
              Coming Soon
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Document Analyzer",
                description:
                  "Extract insights, key points, and summaries from long documents.",
                icon: FileText,
              },
              {
                name: "Code Explainer",
                description:
                  "Get line-by-line explanations of complex code snippets.",
                icon: Terminal,
              },
              {
                name: "Data Visualizer",
                description:
                  "Transform raw data into insightful charts with natural language.",
                icon: BarChart3,
              },
            ].map((tool, index) => (
              <motion.div
                key={tool.name}
                custom={index + filteredTools.length}
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <Card className="h-full overflow-hidden opacity-60 cursor-not-allowed border border-border bg-card">
                  <div className={`p-6 relative overflow-hidden`}>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`p-2.5 rounded-xl bg-muted text-muted-foreground`}
                      >
                        <tool.icon className="h-5 w-5" />
                      </div>

                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        Coming Soon
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      {tool.name}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-4">
                      {tool.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating CTA Button - Simplified */}
      <AnimatePresence>
        {showFloatingCTA && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="lg"
              onClick={() => router.push("/")}
              className="group rounded-full shadow-lg hover:shadow-xl py-3 px-6 transition-all"
            >
              <AtSign className="h-5 w-5 mr-2" />
              <span className="mr-1">Try MentionAI</span>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
