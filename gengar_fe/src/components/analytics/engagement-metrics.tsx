"use client";

import { useQuery } from "@tanstack/react-query";
import { gengarApi } from "@/services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Repeat, MessageSquare, TrendingUp } from "lucide-react";

interface EngagementMetricsProps {
  uniqueId: string;
  startDate?: string;
  endDate?: string;
}

export function EngagementMetrics({
  uniqueId,
  startDate,
  endDate,
}: EngagementMetricsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["app-engagement-metrics", uniqueId, startDate, endDate],
    queryFn: () =>
      gengarApi.getAppEngagementMetrics(uniqueId, startDate, endDate),
    enabled: !!uniqueId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-primary/10 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Avg Messages / Conversation
          </CardTitle>
          <TrendingUp className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.avgMessagesPerConversation.toFixed(1)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.uniqueUsers.toLocaleString()}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Repeat Visitor Rate
          </CardTitle>
          <Repeat className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(data.repeatVisitorRate * 100).toFixed(1)}%
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Conversations
          </CardTitle>
          <MessageSquare className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.totalConversations.toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
