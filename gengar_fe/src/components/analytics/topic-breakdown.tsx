"use client";

import { useQuery } from "@tanstack/react-query";
import { gengarApi } from "@/services/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart } from "lucide-react";

interface TopicBreakdownProps {
  uniqueId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  entertainment: "Entertainment",
  education: "Education",
  finance: "Finance",
  tech_and_science: "Tech & Science",
  history: "History",
  art_and_culture: "Art & Culture",
  politics: "Politics",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  entertainment: "bg-blue-500",
  education: "bg-green-500",
  finance: "bg-yellow-500",
  tech_and_science: "bg-purple-500",
  history: "bg-orange-500",
  art_and_culture: "bg-pink-500",
  politics: "bg-red-500",
  other: "bg-gray-500",
};

export function TopicBreakdown({ uniqueId }: TopicBreakdownProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["app-topic-breakdown", uniqueId],
    queryFn: () => gengarApi.getAppTopicBreakdown(uniqueId),
    enabled: !!uniqueId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-48 bg-primary/10 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.topics?.length) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="size-5 text-muted-foreground" />
          <CardTitle className="text-lg">Topic Breakdown</CardTitle>
        </div>
        <CardDescription>
          Categories of conversations with your digital clone
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.topics.map((topic) => (
            <div
              key={topic.category}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    CATEGORY_COLORS[topic.category] || "bg-gray-500"
                  }`}
                />
                <span className="text-sm truncate">
                  {CATEGORY_LABELS[topic.category] || topic.category}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-24 bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      CATEGORY_COLORS[topic.category] || "bg-gray-500"
                    }`}
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {topic.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
