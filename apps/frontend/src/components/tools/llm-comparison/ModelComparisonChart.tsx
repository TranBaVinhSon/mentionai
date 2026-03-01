"use client";

import { Model } from "@/app/(tools)/tools/llm-comparison/types";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface ModelComparisonChartProps {
  models: Model[];
  benchmarkType: string;
}

const ModelComparisonChart = ({
  models,
  benchmarkType,
}: ModelComparisonChartProps) => {
  if (models.length === 0) return null;

  const chartData = models.map((model) => {
    const dataPoint: any = { name: model.name };
    
    if (benchmarkType === "all") {
      Object.keys(model.benchmarks).forEach((key) => {
        const value = model.benchmarks[key];
        dataPoint[key] = value ? parseFloat(value) : 0;
      });
    } else {
      const value = model.benchmarks[benchmarkType];
      dataPoint[benchmarkType] = value ? parseFloat(value) : 0;
    }
    
    return dataPoint;
  });

  const chartConfig = benchmarkType === "all" 
    ? models.reduce((acc, model) => {
        Object.keys(model.benchmarks).forEach((key) => {
          if (!acc[key]) {
            acc[key] = { label: key };
          }
        });
        return acc;
      }, {} as any)
    : { [benchmarkType]: { label: benchmarkType } };

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <div className="w-full p-4 bg-card rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {benchmarkType === "all" 
            ? "All Benchmarks Comparison" 
            : `${benchmarkType} Benchmark Comparison`}
        </h3>
      </div>
      <ChartContainer config={chartConfig} className="h-[400px]">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {benchmarkType === "all" 
            ? Object.keys(chartConfig).map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={colors[index % colors.length]}
                />
              ))
            : <Bar dataKey={benchmarkType} fill={colors[0]} />
          }
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export default ModelComparisonChart;
