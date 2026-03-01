"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Calculator,
  Info,
  FileText,
  Sigma,
  Send,
  Building,
  Database,
  CircleDollarSign,
  Sparkles,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ModelLogo from "@/components/shared/model-logo";
import { useDebounce } from "@/hooks/useDebounce";

// --- Component Types ---
interface ModelPriceData {
  provider: string;
  name: string;
  context_length: string;
  price_input_per_1M?: string;
  price_output_per_1M?: string;
  price_per_call?: string;
}

type SortConfig = {
  key: keyof ProcessedModelData; // Changed to use ProcessedModelData
  direction: "asc" | "desc";
} | null;

interface ProcessedModelData extends ModelPriceData {
  totalCost: number;
}

// --- Constants ---
const CHARS_PER_TOKEN = 4;
const WORDS_PER_TOKEN = 0.75;
const DEBOUNCE_DELAY = 300; // milliseconds

// --- Component ---
export default function LLMPricePredictionPage() {
  const [allModels, setAllModels] = useState<ModelPriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputType, setInputType] = useState<"tokens" | "words" | "chars">(
    "tokens"
  );
  const [inputValue, setInputValue] = useState<string>("10000");
  const [outputValue, setOutputValue] = useState<string>("10000");
  const [apiCalls, setApiCalls] = useState<string>("1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "totalCost",
    direction: "asc",
  });

  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);

  useEffect(() => {
    async function fetchModels() {
      try {
        setIsLoading(true);
        const response = await fetch("/datasets/llm-benchmark-models.json");
        const data = await response.json();
        if (data && data.openai_models && Array.isArray(data.openai_models)) {
          const pricedModels = data.openai_models.filter(
            (m: any) =>
              m.price_input_per_1M || m.price_output_per_1M || m.price_per_call
          );
          setAllModels(pricedModels);
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

  const calculatedTokens = useMemo(() => {
    const inputNum = parseFloat(inputValue) || 0;
    const outputNum = parseFloat(outputValue) || 0;

    if (inputType === "tokens") {
      return { input: inputNum, output: outputNum };
    }
    const factor =
      inputType === "words" ? WORDS_PER_TOKEN : 1 / CHARS_PER_TOKEN;
    return {
      input: Math.ceil(inputNum * factor),
      output: Math.ceil(outputNum * factor),
    };
  }, [inputValue, outputValue, inputType]);

  const numApiCalls = useMemo(() => parseInt(apiCalls) || 0, [apiCalls]);

  const calculateTotalCost = useMemo(() => {
    return (model: ModelPriceData): number => {
      const inputTokens = calculatedTokens.input;
      const outputTokens = calculatedTokens.output;

      const inputPrice1M = parseFloat(model.price_input_per_1M || "NaN");
      const outputPrice1M = parseFloat(model.price_output_per_1M || "NaN");
      const perCallPrice = parseFloat(model.price_per_call || "NaN");

      const inputCost = !isNaN(inputPrice1M)
        ? (inputTokens / 1_000_000) * inputPrice1M
        : 0;
      const outputCost = !isNaN(outputPrice1M)
        ? (outputTokens / 1_000_000) * outputPrice1M
        : 0;
      const callCost = !isNaN(perCallPrice) ? numApiCalls * perCallPrice : 0;

      if (isNaN(inputPrice1M) && isNaN(outputPrice1M) && isNaN(perCallPrice))
        return NaN;
      return inputCost + outputCost + callCost;
    };
  }, [calculatedTokens, numApiCalls]);

  const displayModels = useMemo(() => {
    let processableModels: ModelPriceData[] = [...allModels];

    // 1. Filter (using debounced value)
    if (debouncedSearchQuery) {
      const lowerCaseQuery = debouncedSearchQuery.toLowerCase();
      processableModels = processableModels.filter(
        (model) =>
          model.name?.toLowerCase().includes(lowerCaseQuery) ||
          model.provider?.toLowerCase().includes(lowerCaseQuery)
      );
    }

    // 2. Calculate cost
    const modelsWithCost: ProcessedModelData[] = processableModels.map(
      (model) => ({
        ...model,
        totalCost: calculateTotalCost(model),
      })
    );

    // 3. Sort
    if (sortConfig) {
      modelsWithCost.sort((a, b) => {
        let aValue: string | number | undefined;
        let bValue: string | number | undefined;

        const parseContext = (context: string): number => {
          const num = parseFloat(context.replace(/[^\d.]/g, ""));
          const multiplier = context.toUpperCase().includes("K") ? 1000 : 1;
          return isNaN(num) ? 0 : num * multiplier;
        };

        const key = sortConfig.key;

        if (key === "totalCost") {
          aValue = a.totalCost;
          bValue = b.totalCost;
        } else if (key === "context_length") {
          aValue = parseContext(a.context_length);
          bValue = parseContext(b.context_length);
        } else if (key === "price_input_per_1M") {
          aValue = a.price_input_per_1M
            ? parseFloat(a.price_input_per_1M)
            : NaN;
          bValue = b.price_input_per_1M
            ? parseFloat(b.price_input_per_1M)
            : NaN;
        } else if (key === "price_output_per_1M") {
          aValue = a.price_output_per_1M
            ? parseFloat(a.price_output_per_1M)
            : NaN;
          bValue = b.price_output_per_1M
            ? parseFloat(b.price_output_per_1M)
            : NaN;
        } else if (key === "price_per_call") {
          aValue = a.price_per_call ? parseFloat(a.price_per_call) : NaN;
          bValue = b.price_per_call ? parseFloat(b.price_per_call) : NaN;
        } else {
          aValue = a[key];
          bValue = b[key];
        }

        if (key === "totalCost") {
          if (isNaN(aValue as number)) return 1;
          if (isNaN(bValue as number)) return -1;
        }
        if (typeof aValue === "number" && isNaN(aValue)) return 1;
        if (typeof bValue === "number" && isNaN(bValue)) return -1;

        let comparison = 0;
        if (aValue === undefined || aValue === null) comparison = 1;
        else if (bValue === undefined || bValue === null) comparison = -1;
        else if (typeof aValue === "string" && typeof bValue === "string") {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === "number" && typeof bValue === "number") {
          comparison = aValue - bValue;
        }

        return sortConfig.direction === "asc" ? comparison : comparison * -1;
      });
    }

    return modelsWithCost;
  }, [allModels, debouncedSearchQuery, sortConfig, calculateTotalCost]);

  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return "N/A";
    // Show more precision for smaller amounts
    const precision = value < 0.01 && value !== 0 ? 6 : 4;
    return `$${value.toFixed(precision)}`;
  };

  const renderTooltip = (content: string) => (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="ml-1 h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const handleSort = (key: keyof ProcessedModelData) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof ProcessedModelData }) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <ArrowUp className="ml-2 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      );
    }
    return (
      <AnimatePresence initial={false}>
        <motion.div
          key={sortConfig.direction}
          initial={{ opacity: 0, y: sortConfig.direction === "asc" ? -5 : 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: sortConfig.direction === "asc" ? 5 : -5 }}
          transition={{ duration: 0.2 }}
          className="ml-2"
        >
          {sortConfig.direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  const SortableHeader = ({
    columnKey,
    children,
    title,
    className,
  }: {
    columnKey: keyof ProcessedModelData;
    children: React.ReactNode;
    title: string;
    className?: string;
  }) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleSort(columnKey)}
            className={`group flex items-center justify-start w-full px-1 py-1 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-50 rounded-md ${className}`}
          >
            {children}
            <SortIcon columnKey={columnKey} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Sort by {title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          LLM Price Prediction Tool
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Estimate API costs for various Large Language Models based on your
          usage. Input your expected tokens, words, or characters, and API calls
          to compare costs.
        </p>
      </motion.div>

      {/* Input Section */}
      <Card className="mb-12 shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculate Your Estimated Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Input Amount & Type */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center">
                Input/Output Usage
                {renderTooltip(
                  `Enter the estimated amount for BOTH input and output. Conversion rates: ${CHARS_PER_TOKEN} chars ≈ 1 token, ${WORDS_PER_TOKEN} words ≈ 1 token.`
                )}
              </label>
              <Tabs
                defaultValue="tokens"
                value={inputType}
                onValueChange={(value) =>
                  setInputType(value as "tokens" | "words" | "chars")
                }
                className="w-full mb-2"
              >
                <TabsList className="grid w-full grid-cols-3 h-9">
                  <TabsTrigger value="tokens" className="text-xs h-7">
                    Tokens
                  </TabsTrigger>
                  <TabsTrigger value="words" className="text-xs h-7">
                    Words
                  </TabsTrigger>
                  <TabsTrigger value="chars" className="text-xs h-7">
                    Characters
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Input ${inputType}`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  min="0"
                  className="transition-colors focus:border-primary bg-muted/50"
                />
                <Input
                  type="number"
                  placeholder={`Output ${inputType}`}
                  value={outputValue}
                  onChange={(e) => setOutputValue(e.target.value)}
                  min="0"
                  className="transition-colors focus:border-primary bg-muted/50"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Estimated Tokens: {calculatedTokens.input.toLocaleString()}{" "}
                input / {calculatedTokens.output.toLocaleString()} output
              </p>
            </div>

            {/* API Calls */}
            <div>
              <label
                htmlFor="apiCalls"
                className="block text-sm font-medium mb-1 flex items-center"
              >
                Number of API Calls
                {renderTooltip(
                  "Enter the total number of API calls you expect to make. Some models might have a per-call fee in addition to token costs."
                )}
              </label>
              <Input
                id="apiCalls"
                type="number"
                placeholder="e.g., 100"
                value={apiCalls}
                onChange={(e) => setApiCalls(e.target.value)}
                min="0"
                className="transition-colors focus:border-primary bg-muted/50"
              />
            </div>

            {/* Summary - Optional or add later */}
            <div className="md:col-span-1 flex flex-col justify-center items-center p-4 rounded-lg border">
              <Sparkles className="h-6 w-6" />
              <p className="text-center text-sm font-medium">
                Costs are calculated based on public pricing data. Ensure you
                check official provider documentation for the most accurate
                rates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="shadow-sm border">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
          <CardTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            Estimated Costs Per Model (
            {isLoading ? "..." : displayModels.length})
          </CardTitle>
          <div className="relative w-full md:w-64">
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 h-9 text-sm rounded-md focus:border-primary focus:ring-primary"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Loading model pricing data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full divide-y divide-border">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[260px] px-4 py-3">
                      <SortableHeader columnKey="name" title="Provider / Model">
                        <Building className="h-3.5 w-3.5 mr-1.5 shrink-0" />{" "}
                        Provider / Model
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      <SortableHeader
                        columnKey="context_length"
                        title="Context Length"
                        className="justify-end"
                      >
                        <Database className="h-3.5 w-3.5 mr-1.5 shrink-0" />{" "}
                        Context
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      <SortableHeader
                        columnKey="price_input_per_1M"
                        title="Input Price / 1K Tokens"
                        className="justify-end"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />{" "}
                        Input / 1K
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      <SortableHeader
                        columnKey="price_output_per_1M"
                        title="Output Price / 1K Tokens"
                        className="justify-end"
                      >
                        <Sigma className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Output
                        / 1K
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      <SortableHeader
                        columnKey="price_per_call"
                        title="Price Per Call"
                        className="justify-end"
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Per
                        Call
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap px-4 py-3">
                      <SortableHeader
                        columnKey="totalCost"
                        title="Total Estimated Cost"
                        className="justify-end font-semibold"
                      >
                        <DollarSign className="h-3.5 w-3.5 mr-1.5 shrink-0" />{" "}
                        Total Cost
                      </SortableHeader>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border bg-card">
                  {displayModels.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-16 text-muted-foreground"
                      >
                        {searchQuery
                          ? `No models found matching "${searchQuery}".`
                          : "No pricing data available."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayModels.map((model, index) => {
                      const totalCost = model.totalCost;
                      const inputPrice1k = model.price_input_per_1M
                        ? parseFloat(model.price_input_per_1M) / 1000
                        : undefined;
                      const outputPrice1k = model.price_output_per_1M
                        ? parseFloat(model.price_output_per_1M) / 1000
                        : undefined;
                      const perCallPrice = model.price_per_call
                        ? parseFloat(model.price_per_call)
                        : undefined;
                      const isCheapest =
                        sortConfig?.key === "totalCost" &&
                        sortConfig?.direction === "asc" &&
                        index === 0 &&
                        !isNaN(totalCost);

                      return (
                        <TableRow
                          key={`${model.provider}-${model.name}-${index}`}
                          className={`transition-colors duration-150 ease-in-out ${
                            isCheapest
                              ? "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <TableCell className="px-4 py-3 align-top">
                            <div className="flex items-center gap-3">
                              <ModelLogo model={model.name} size={24} />
                              <div>
                                <div
                                  className={`font-medium text-sm ${
                                    isCheapest
                                      ? "text-green-700 dark:text-green-400"
                                      : "text-foreground"
                                  }`}
                                >
                                  {model.name}
                                  {isCheapest && (
                                    <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                                      Cheapest
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {model.provider}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top text-right font-mono text-sm text-muted-foreground tabular-nums">
                            {model.context_length}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top text-right font-mono text-sm text-muted-foreground tabular-nums">
                            {formatCurrency(inputPrice1k)}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top text-right font-mono text-sm text-muted-foreground tabular-nums">
                            {formatCurrency(outputPrice1k)}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top text-right font-mono text-sm text-muted-foreground tabular-nums">
                            {formatCurrency(perCallPrice)}
                          </TableCell>
                          <TableCell
                            className={`px-4 py-3 align-top text-right font-mono text-sm font-medium tabular-nums ${
                              isCheapest
                                ? "text-green-700 dark:text-green-400"
                                : "text-foreground"
                            }`}
                          >
                            {formatCurrency(totalCost)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
