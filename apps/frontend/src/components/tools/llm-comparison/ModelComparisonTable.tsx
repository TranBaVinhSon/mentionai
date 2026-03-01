"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Model } from "@/app/(tools)/tools/llm-comparison/types";

interface ModelComparisonTableProps {
  models: Model[];
}

const ModelComparisonTable = ({ models }: ModelComparisonTableProps) => {
  const benchmarkKeys = new Set<string>();
  models.forEach((model) => {
    Object.keys(model.benchmarks).forEach((key) => benchmarkKeys.add(key));
  });

  return (
    <div className="w-full overflow-x-auto">
      <Table className="border-collapse w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px] bg-muted/50">Model</TableHead>
            <TableHead className="bg-muted/50">Description</TableHead>
            <TableHead className="bg-muted/50">Reasoning</TableHead>
            <TableHead className="bg-muted/50">Speed</TableHead>
            <TableHead className="bg-muted/50">Input Support</TableHead>
            <TableHead className="bg-muted/50">Context Length</TableHead>
            <TableHead className="bg-muted/50">Price (Input/Output)</TableHead>
            {Array.from(benchmarkKeys).map((key) => (
              <TableHead key={key} className="bg-muted/50">
                <div className="flex items-center space-x-1">
                  <span>{key}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-0 border-0 bg-transparent">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-56">{key} benchmark score</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model, i) => (
            <TableRow
              key={model.name}
              className={i % 2 === 0 ? "bg-background" : "bg-muted/50"}
            >
              <TableCell className="font-medium">{model.name}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild className="text-left">
                      <button className="p-0 border-0 bg-transparent text-left">
                        <span className="truncate block">
                          {model.description}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-80">{model.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>{model.additional_features.reasoning}</TableCell>
              <TableCell>{model.additional_features.speed}</TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  {model.additional_features.supports_input.map((input) => (
                    <div
                      key={input}
                      className="px-2 py-1 bg-muted/70 rounded text-xs"
                    >
                      {input}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>{model.context_length}</TableCell>
              <TableCell>
                ${model.price_input_per_1M}/${model.price_output_per_1M}
              </TableCell>

              {Array.from(benchmarkKeys).map((key) => (
                <TableCell key={key} className="font-mono">
                  {model.benchmarks[key] || "N/A"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ModelComparisonTable;
