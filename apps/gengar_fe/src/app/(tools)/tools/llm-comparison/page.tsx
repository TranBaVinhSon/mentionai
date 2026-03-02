"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CircleCheck,
  CircleX,
  Zap,
  Circle,
  ChevronDown,
  Info,
  Table as TableIcon,
  BarChart,
  LayoutGrid,
  RotateCcw,
  FileText,
  ImageIcon,
  AudioWaveform,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { Model, ViewMode } from "./types";
import ModelMultiSelect from "@/components/tools/llm-comparison/ModelMultiSelect";
import ModelComparisonTable from "@/components/tools/llm-comparison/ModelComparisonTable";
import AdPopup from "../../../../components/tools/AdPopup";

// Lazy load the chart component since it's only needed when chart view is selected
const ModelComparisonChart = lazy(() => import("@/components/tools/llm-comparison/ModelComparisonChart"));

export default function LLMComparisonPage() {
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedModelData, setSelectedModelData] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [activeBenchmark, setActiveBenchmark] = useState<string>("all");
  const [showAdPopup, setShowAdPopup] = useState(false);
  const maxModelsToCompare = 5;

  useEffect(() => {
    async function fetchModels() {
      try {
        setIsLoading(true);
        const response = await fetch("/datasets/llm-benchmark-models.json");
        const data = await response.json();

        if (data && data.openai_models && Array.isArray(data.openai_models)) {
          const fetchedModels = data.openai_models;
          setAllModels(fetchedModels);

          const targetNames = ["Gemini 1.5 Pro", "Gemini 1.5 Flash", "GPT-4.1"];
          let initialSelectedNames: string[] = [];

          targetNames.forEach((targetName) => {
            const found = fetchedModels.find(
              (m: Model) => m.name === targetName
            );
            if (found) initialSelectedNames.push(found.name);
          });

          if (initialSelectedNames.length < 3) {
            const fallbacks = [
              fetchedModels.find(
                (m: Model) =>
                  m.name.includes("Gemini") && m.name.includes("Pro")
              )?.name,
              fetchedModels.find(
                (m: Model) =>
                  m.name.includes("Gemini") && m.name.includes("Flash")
              )?.name,
              fetchedModels.find(
                (m: Model) =>
                  m.name.includes("GPT-4") || m.name.includes("gpt-4")
              )?.name,
            ].filter(Boolean) as string[];

            fallbacks.forEach((name) => {
              if (
                initialSelectedNames.length < 3 &&
                !initialSelectedNames.includes(name)
              ) {
                initialSelectedNames.push(name);
              }
            });
          }

          if (initialSelectedNames.length < 3 && fetchedModels.length > 0) {
            fetchedModels.slice(0, 3).forEach((m: Model) => {
              if (
                initialSelectedNames.length < 3 &&
                !initialSelectedNames.includes(m.name)
              ) {
                initialSelectedNames.push(m.name);
              }
            });
          }

          setSelectedModels(initialSelectedNames);
        } else {
          console.error("Fetched data is not in the expected format:", data);
          setAllModels([]);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        setAllModels([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchModels();
  }, []);

  useEffect(() => {
    if (allModels.length > 0) {
      const modelData = selectedModels
        .map((name) => allModels.find((model) => model.name === name) || null)
        .filter(Boolean) as Model[];
      setSelectedModelData(modelData);
    }
  }, [selectedModels, allModels]);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      setShowAdPopup(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  const getColorClassesForModel = (index: number) => {
    const palettes = [
      {
        gradient: "bg-gradient-to-br from-cyan-400 via-blue-500 to-teal-500",
        text: "text-white",
        border: "border-transparent",
      },
      {
        gradient:
          "bg-gradient-to-bl from-orange-200 via-blue-300 to-yellow-200",
        text: "text-white",
        border: "border-transparent",
      },
      {
        gradient:
          "bg-gradient-to-tr from-yellow-300 via-pink-400 to-purple-500",
        text: "text-white",
        border: "border-transparent",
      },
      {
        gradient: "bg-gradient-to-r from-green-400 to-lime-500",
        text: "text-white",
        border: "border-transparent",
      },
      {
        gradient: "bg-gradient-to-tl from-purple-500 to-indigo-600",
        text: "text-white",
        border: "border-transparent",
      },
    ];
    const palette = palettes[index % palettes.length];
    return {
      cardBg: "bg-transparent",
      cardBorder: palette.border,
      textColor: palette.text,
      gradient: palette.gradient,
    };
  };

  const renderRatingDots = (rating: string, max = 5) => {
    const levels: { [key: string]: number } = {
      "Very High": 5,
      High: 4,
      Moderate: 3,
      Low: 2,
    };
    const level = levels[rating] || 1;

    return (
      <div className="flex space-x-1 items-center">
        {Array.from({ length: max }).map((_, i) => (
          <Circle
            key={i}
            className={`w-3.5 h-3.5 transition-colors duration-200 ${
              i < level
                ? "text-foreground fill-foreground"
                : "text-muted-foreground/30 fill-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderLightningBolts = (speed: string) => {
    const levels: { [key: string]: number } = {
      "Very High": 3,
      High: 3,
      Moderate: 2,
      Low: 1,
    };
    const level = levels[speed] || 1;

    return (
      <div className="flex space-x-0.5 items-center">
        {Array.from({ length: 3 }).map((_, i) => (
          <Zap
            key={i}
            className={`w-4 h-4 transition-colors duration-200 ${
              i < level
                ? "text-foreground fill-current"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderCapabilityIcon = (
    capability: "text" | "image" | "audio",
    supported: boolean
  ) => {
    const icons = {
      text: FileText,
      image: ImageIcon,
      audio: AudioWaveform,
    };
    const IconComponent = icons[capability];
    const label = capability.charAt(0).toUpperCase() + capability.slice(1);

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-6 h-6 flex justify-center items-center rounded-full transition-colors duration-200">
              {supported && <IconComponent className="w-4 h-4" />}
            </div>
          </TooltipTrigger>
          {supported && (
            <TooltipContent>
              <p className="text-xs">{`${label} supported`}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSection((prev) => (prev === sectionName ? null : sectionName));
  };

  const renderSectionHeader = (title: string, sectionName: string) => (
    <button
      className="flex justify-between items-center w-full mb-2 cursor-pointer group py-1"
      onClick={() => toggleSection(sectionName)}
      aria-expanded={expandedSection === sectionName}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
        {title}
      </span>
      <ChevronDown
        className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform duration-200 ${
          expandedSection === sectionName ? "rotate-180" : ""
        }`}
      />
    </button>
  );

  const handleResetComparison = () => {
    if (allModels.length > 0) {
      const targetNames = ["Gemini 1.5 Pro", "Gemini 1.5 Flash", "GPT-4.1"];
      let initialSelectedNames: string[] = [];
      targetNames.forEach((targetName) => {
        const found = allModels.find((m: Model) => m.name === targetName);
        if (found) initialSelectedNames.push(found.name);
      });
      if (initialSelectedNames.length < 3) {
        const fallbacks = [
          allModels.find(
            (m: Model) => m.name.includes("Gemini") && m.name.includes("Pro")
          )?.name,
          allModels.find(
            (m: Model) => m.name.includes("Gemini") && m.name.includes("Flash")
          )?.name,
          allModels.find(
            (m: Model) => m.name.includes("GPT-4") || m.name.includes("gpt-4")
          )?.name,
        ].filter(Boolean) as string[];
        fallbacks.forEach((name) => {
          if (
            initialSelectedNames.length < 3 &&
            !initialSelectedNames.includes(name)
          ) {
            initialSelectedNames.push(name);
          }
        });
      }
      if (initialSelectedNames.length < 3 && allModels.length > 0) {
        allModels.slice(0, 3).forEach((m: Model) => {
          if (
            initialSelectedNames.length < 3 &&
            !initialSelectedNames.includes(m.name)
          ) {
            initialSelectedNames.push(m.name);
          }
        });
      }
      setSelectedModels(initialSelectedNames);
    }
  };

  const getBenchmarkKeys = () => {
    const benchmarkKeys = new Set<string>();
    selectedModelData.forEach((model) => {
      if (model.benchmarks) {
        Object.keys(model.benchmarks).forEach((key) => benchmarkKeys.add(key));
      }
    });
    return Array.from(benchmarkKeys).sort();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          <p className="text-lg text-muted-foreground">Loading model data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 max-w-full lg:max-w-screen-xl xl:max-w-screen-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-0">
          LLM Comparison
        </h1>
        <div className="flex items-center space-x-2">
          <Link
            href="#benchmarks"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            About Benchmarks
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetComparison}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      <div className="mb-8 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <label className="block text-sm font-medium mb-2">
          Select models to compare (up to {maxModelsToCompare}):
        </label>
        <ModelMultiSelect
          models={allModels}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          maxSelections={maxModelsToCompare}
        />
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center bg-muted p-1 rounded-lg space-x-1">
          {(
            [
              { mode: "cards", label: "Cards", icon: LayoutGrid },
              { mode: "chart", label: "Chart", icon: BarChart },
              { mode: "table", label: "Table", icon: TableIcon },
            ] as const
          ).map((item) => (
            <Button
              key={item.mode}
              variant={viewMode === item.mode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode(item.mode)}
              className={`flex items-center gap-1.5 px-3 py-1 h-8 transition-colors duration-150 ${
                viewMode === item.mode
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">
                {item.label}
              </span>
            </Button>
          ))}
        </div>

        {viewMode === "chart" && (
          <div className="w-full sm:w-auto">
            <Tabs
              defaultValue={activeBenchmark}
              onValueChange={setActiveBenchmark}
              className="w-full"
            >
              <TabsList className="flex flex-wrap justify-start sm:justify-end bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="all"
                  className="text-xs px-2.5 py-1 h-7 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 border border-border rounded-md data-[state=active]:border-blue-200 data-[state=active]:shadow-sm hover:bg-muted transition-colors"
                >
                  All Benchmarks
                </TabsTrigger>
                {getBenchmarkKeys().map((key) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="text-xs px-2.5 py-1 h-7 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 border border-border rounded-md data-[state=active]:border-blue-200 data-[state=active]:shadow-sm hover:bg-muted transition-colors"
                  >
                    {key}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {selectedModelData.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Please select one or more models to start the comparison.</p>
        </div>
      )}

      {viewMode === "cards" && selectedModelData.length > 0 && (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-${Math.min(
            selectedModelData.length,
            maxModelsToCompare
          )} gap-5`}
        >
          <AnimatePresence>
            {selectedModelData.map((model, index) => {
              const colors = getColorClassesForModel(index);
              return (
                <motion.div
                  key={model.name}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex flex-col space-y-4"
                >
                  <Card
                    className={`overflow-hidden ${colors.cardBorder} shadow-md rounded-xl`}
                  >
                    <CardContent
                      className={`p-6 flex justify-center items-center text-center h-28 md:h-32 ${colors.gradient}`}
                    >
                      <h2
                        className={`text-2xl md:text-3xl font-bold ${colors.textColor} tracking-tight text-shadow-sm`}
                      >
                        {model.name}
                      </h2>
                    </CardContent>
                  </Card>

                  <p className="text-sm text-muted-foreground px-1 min-h-[40px]">
                    {model.description}
                  </p>

                  <Card
                    className={`flex-grow border ${colors.cardBorder} bg-card shadow-sm`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-center py-1.5 border-b">
                        <span className="text-sm font-medium text-card-foreground">
                          Reasoning
                        </span>
                        {renderRatingDots(
                          model.additional_features.reasoning,
                          5
                        )}
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b">
                        <span className="text-sm font-medium text-card-foreground">
                          Speed
                        </span>
                        {renderLightningBolts(model.additional_features.speed)}
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b">
                        <div className="flex items-center text-sm font-medium text-card-foreground">
                          Input
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild className="ml-1">
                                <button className="p-0 border-0 bg-transparent">
                                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs w-48">
                                  Supported input modalities
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex gap-1.5">
                          {renderCapabilityIcon(
                            "text",
                            model.additional_features.supports_input.includes(
                              "text"
                            )
                          )}
                          {renderCapabilityIcon(
                            "image",
                            model.additional_features.supports_input.includes(
                              "image"
                            )
                          )}
                          {renderCapabilityIcon(
                            "audio",
                            model.additional_features.supports_input.includes(
                              "audio"
                            )
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b">
                        <div className="flex items-center text-sm font-medium text-card-foreground">
                          Output
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild className="ml-1">
                                <button className="p-0 border-0 bg-transparent">
                                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs w-48">
                                  Supported output modalities
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex gap-1.5">
                          {renderCapabilityIcon(
                            "text",
                            model.additional_features.supports_output.includes(
                              "text"
                            )
                          )}
                          {renderCapabilityIcon(
                            "image",
                            model.additional_features.supports_output.includes(
                              "image"
                            )
                          )}
                          {renderCapabilityIcon(
                            "audio",
                            model.additional_features.supports_output.includes(
                              "audio"
                            )
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-1.5">
                        <div className="flex items-center text-sm font-medium text-card-foreground">
                          Reasoning Tokens
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild className="ml-1">
                                <button className="p-0 border-0 bg-transparent">
                                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs w-48">
                                  Supports reasoning tokens
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {model.additional_features.reasoning_tokens ? (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <CircleCheck className="w-4 h-4 mr-1" />
                            <span className="text-xs font-medium">Yes</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-muted-foreground">
                            <CircleX className="w-4 h-4 mr-1" />
                            <span className="text-xs font-medium">No</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`border ${colors.cardBorder} bg-card shadow-sm`}
                  >
                    <CardContent className="p-4">
                      {renderSectionHeader("Pricing", `pricing-${index}`)}
                      <AnimatePresence>
                        {(expandedSection === `pricing-${index}` ||
                          expandedSection === null) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{
                              height: "auto",
                              opacity: 1,
                              marginTop: "0.5rem",
                            }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2 overflow-hidden"
                          >
                            <div className="flex justify-between items-center py-1 border-b border-dashed">
                              <span className="text-xs text-muted-foreground">
                                Input (per 1M)
                              </span>
                              <span className="font-mono text-xs text-foreground font-medium">
                                ${model.price_input_per_1M || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-dashed">
                              <div className="flex items-center text-xs text-muted-foreground">
                                Cached Input
                                <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                    <TooltipTrigger asChild className="ml-1">
                                      <button className="p-0 border-0 bg-transparent">
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="text-xs w-48">
                                        Approx. 25% of regular price
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <span className="font-mono text-xs text-foreground font-medium">
                                $
                                {(
                                  parseFloat(model.price_input_per_1M || "0") *
                                  0.25
                                ).toFixed(5)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-muted-foreground">
                                Output (per 1M)
                              </span>
                              <span className="font-mono text-xs text-foreground font-medium">
                                ${model.price_output_per_1M || "N/A"}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>

                  <Card
                    className={`border ${colors.cardBorder} bg-card shadow-sm`}
                  >
                    <CardContent className="p-4">
                      {renderSectionHeader("Context", `context-${index}`)}
                      <AnimatePresence>
                        {(expandedSection === `context-${index}` ||
                          expandedSection === null) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{
                              height: "auto",
                              opacity: 1,
                              marginTop: "0.5rem",
                            }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2 overflow-hidden"
                          >
                            <div className="flex justify-between items-center py-1 border-b border-dashed">
                              <span className="text-xs text-muted-foreground">
                                Window
                              </span>
                              <span className="font-mono text-xs text-foreground font-medium">
                                {model.context_length || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-dashed">
                              <span className="text-xs text-muted-foreground">
                                Max Output
                              </span>
                              <span className="font-mono text-xs text-foreground font-medium">
                                {model.additional_features.max_output_tokens ||
                                  (parseInt(model.context_length) > 100000
                                    ? 100000
                                    : 32768) ||
                                  "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-muted-foreground">
                                Knowledge Cutoff
                              </span>
                              <span className="text-xs text-foreground font-medium">
                                {model.additional_features.knowledge_cutoff ||
                                  "N/A"}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>

                  {model.benchmarks &&
                    Object.keys(model.benchmarks).length > 0 && (
                      <Card
                        className={`border ${colors.cardBorder} bg-card shadow-sm`}
                      >
                        <CardContent className="p-4">
                          {renderSectionHeader(
                            "Benchmarks",
                            `benchmarks-${index}`
                          )}
                          <AnimatePresence>
                            {(expandedSection === `benchmarks-${index}` ||
                              expandedSection === null) && (
                              <motion.div
                                initial={{
                                  height: 0,
                                  opacity: 0,
                                  marginTop: 0,
                                }}
                                animate={{
                                  height: "auto",
                                  opacity: 1,
                                  marginTop: "0.5rem",
                                }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2 overflow-hidden"
                              >
                                {Object.entries(model.benchmarks).map(
                                  ([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex justify-between items-center py-1 border-b border-dashed last:border-b-0"
                                    >
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        {key}
                                        <TooltipProvider delayDuration={100}>
                                          <Tooltip>
                                            <TooltipTrigger
                                              asChild
                                              className="ml-1"
                                            >
                                              <button className="p-0 border-0 bg-transparent">
                                                <Info className="h-3 w-3 text-muted-foreground" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                              <p className="text-xs w-48">
                                                {key} score
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <span className="font-mono text-xs text-foreground font-medium">
                                        {value}
                                      </span>
                                    </div>
                                  )
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {viewMode === "chart" && selectedModelData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6">
            <Suspense fallback={
              <div className="flex items-center justify-center h-[400px]">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            }>
              <ModelComparisonChart
                models={selectedModelData}
                benchmarkType={activeBenchmark}
              />
            </Suspense>
          </div>
        </motion.div>
      )}

      {viewMode === "table" && selectedModelData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <ModelComparisonTable models={selectedModelData} />
          </div>
        </motion.div>
      )}

      <div id="benchmarks" className="mt-16 pt-8 border-t">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Benchmark Explanation
        </h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          These benchmarks are standardized tests used to evaluate and compare
          the performance of large language models across various capabilities.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              name: "MMLU",
              description:
                "Massive Multitask Language Understanding test. Covers 57 subjects across STEM, humanities, social sciences, and more, testing world knowledge and problem-solving ability.",
            },
            {
              name: "GPQA",
              description:
                "A challenging dataset of graduate-level questions testing real-world expertise in biology, physics, and chemistry.",
            },
            {
              name: "HumanEval",
              description:
                "Evaluates code generation capabilities by testing functional correctness on programming problems requiring synthesis from docstrings.",
            },
            {
              name: "MATH",
              description:
                "Tests advanced mathematical problem-solving skills with competition-level questions requiring multi-step reasoning.",
            },
          ].map((bench) => (
            <Card
              key={bench.name}
              className="bg-muted/50 border border-border shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {bench.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {bench.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* <AdPopup isOpen={showAdPopup} onClose={() => setShowAdPopup(false)} /> */}
    </div>
  );
}
