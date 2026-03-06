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
import { HelpCircle } from "lucide-react";

interface TopQuestionsProps {
  uniqueId: string;
}

export function TopQuestions({ uniqueId }: TopQuestionsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["app-top-questions", uniqueId],
    queryFn: () => gengarApi.getAppTopQuestions(uniqueId),
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

  if (!data?.questions?.length) return null;

  const maxCount = Math.max(...data.questions.map((q) => q.count));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="size-5 text-muted-foreground" />
          <CardTitle className="text-lg">Top Questions</CardTitle>
        </div>
        <CardDescription>
          Most common opening questions from visitors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.questions.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-start gap-4">
                <p className="text-sm flex-1 line-clamp-2">{item.question}</p>
                <span className="text-sm font-medium text-muted-foreground shrink-0">
                  {item.count}x
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
