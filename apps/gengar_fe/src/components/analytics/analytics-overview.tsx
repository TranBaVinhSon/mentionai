"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface DailyMetric {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  conversationCount: number;
  messageCount: number;
}

interface AnalyticsOverviewProps {
  data: DailyMetric[];
}

const chartConfig = {
  pageViews: {
    label: "Page Views",
    color: "hsl(var(--chart-1))",
  },
  uniqueVisitors: {
    label: "Unique Visitors",
    color: "hsl(var(--chart-2))",
  },
  conversationCount: {
    label: "Conversations",
    color: "hsl(var(--chart-3))",
  },
  messageCount: {
    label: "Messages",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  // Transform data for charts
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    pageViews: item.pageViews,
    uniqueVisitors: item.uniqueVisitors,
    conversationCount: item.conversationCount,
    messageCount: item.messageCount,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Page Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Page Views</CardTitle>
          <CardDescription>Daily page views over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 'dataMax']}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="pageViews"
                type="monotone"
                fill="var(--color-pageViews)"
                fillOpacity={0.4}
                stroke="var(--color-pageViews)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Unique Visitors Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Unique Visitors</CardTitle>
          <CardDescription>Daily unique visitors over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 'dataMax']}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="uniqueVisitors"
                type="monotone"
                fill="var(--color-pageViews)"
                fillOpacity={0.4}
                stroke="var(--color-pageViews)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Conversations Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Daily conversations started</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 'dataMax']}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="conversationCount"
                type="monotone"
                fill="var(--color-pageViews)"
                fillOpacity={0.4}
                stroke="var(--color-pageViews)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Messages Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Daily messages sent</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 'dataMax']}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="messageCount"
                type="monotone"
                fill="var(--color-pageViews)"
                fillOpacity={0.4}
                stroke="var(--color-pageViews)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}