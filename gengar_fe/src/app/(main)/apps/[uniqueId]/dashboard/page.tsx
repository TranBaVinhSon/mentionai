"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useUser } from "@/hooks/use-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarColor, getInitial } from "@/utils/avatar";
import {
  Globe,
  Eye,
  MessageSquare,
  Users,
  RefreshCw,
} from "lucide-react";
import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { ConversationsTable } from "@/components/analytics/conversations-table";
import { DateRangeFilter } from "@/components/analytics/date-range-filter";
import { formatCountryDisplay } from "@/utils/country-mapping";
import { GengarSubscriptionPlan } from "@/services/api";
import { BasicDashboard } from "@/components/analytics/basic-dashboard";
import { EngagementMetrics } from "@/components/analytics/engagement-metrics";
import { TopQuestions } from "@/components/analytics/top-questions";
import { TopicBreakdown } from "@/components/analytics/topic-breakdown";

export default function DashboardPage({
  params,
}: {
  params: { uniqueId: string };
}) {
  const { status } = useSession();
  const router = useRouter();
  const { data: userData, isLoading: isUserLoading } = useUser();
  const [dateRange, setDateRange] = useState<{
    startDate: Date;
    endDate: Date;
  }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  });

  // Determine plan status - treat unknown as free to avoid leaking Plus features
  const isPlusUser =
    userData?.subscriptionPlan === GengarSubscriptionPlan.PLUS ||
    userData?.subscriptionPlan === GengarSubscriptionPlan.PRO;

  // Use custom hook for all dashboard data - only fetch Plus data when confirmed Plus user
  const {
    app,
    analytics,
    conversations,
    mergedAnalytics,
    loading,
    error,
    refreshData,
  } = useDashboardData(params.uniqueId, dateRange, isPlusUser);

  const handleDateRangeChange = (newRange: {
    startDate: Date;
    endDate: Date;
  }) => {
    setDateRange(newRange);
  };

  // Handle authentication redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "unauthenticated") {
    return null;
  }

  if (status === "loading" || isUserLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-primary/10 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-primary/10 rounded animate-pulse"
            ></div>
          ))}
        </div>
        <div className="h-64 bg-primary/10 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    const errorMessage = (() => {
      if (error instanceof Error) {
        if ((error as any).response?.status === 403) {
          return "You don't have permission to view this app's analytics";
        } else if ((error as any).response?.status === 404) {
          return "App not found";
        }
        return error.message;
      }
      return "Failed to load analytics data";
    })();

    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive mb-4">{errorMessage}</p>
            <Button onClick={refreshData}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If user is not Plus, show basic analytics dashboard
  if (!isPlusUser) {
    return (
      <div className="space-y-4 md:space-y-6 px-4 md:px-6 pb-6">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
            <AvatarImage src={app?.logo} alt={app?.displayName || app?.name} />
            <AvatarFallback className={`text-white font-medium ${getAvatarColor(app?.displayName || app?.name || "DC")}`}>
              {getInitial(app?.displayName || app?.name || "DC")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {app?.displayName || app?.name}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Analytics Dashboard
            </p>
          </div>
        </div>
        <BasicDashboard uniqueId={params.uniqueId} />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left side: Avatar and app info */}
        <div className="flex items-center space-x-3 order-1 sm:order-1">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
            <AvatarImage src={app?.logo} alt={app?.displayName || app?.name} />
            <AvatarFallback className={`text-white font-medium ${getAvatarColor(app?.displayName || app?.name || "DC")}`}>
              {getInitial(app?.displayName || app?.name || "DC")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {app?.displayName || app?.name}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Analytics Dashboard
            </p>
          </div>
        </div>

        {/* Right side: Refresh button and date picker */}
        <div className="flex items-center gap-2 order-2 sm:order-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshData}
            disabled={loading}
            className="sm:hidden"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshData}
            disabled={loading}
            className="hidden sm:flex"
          >
            <RefreshCw
              className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <DateRangeFilter
            onDateRangeChange={handleDateRangeChange}
            initialRange={dateRange}
          />
        </div>
      </div>

      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Page Views
              </CardTitle>
              <Eye className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mergedAnalytics?.totalPageViews.toLocaleString() ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Visitors
              </CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mergedAnalytics?.totalUniqueVisitors.toLocaleString() ?? 0}
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
                {mergedAnalytics?.totalConversations.toLocaleString() ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Messages
              </CardTitle>
              <MessageSquare className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mergedAnalytics?.totalMessages.toLocaleString() ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Top Countries
              </CardTitle>
              <Globe className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                {mergedAnalytics?.countryDistribution
                  .slice(0, 3)
                  .map((country, index) => {
                    const displayCount =
                      country.count === 0 &&
                      (mergedAnalytics?.totalUniqueVisitors ?? 0) > 0
                        ? mergedAnalytics?.totalUniqueVisitors ?? 0
                        : country.count;
                    return (
                      <div
                        key={country.country}
                        className="flex justify-between items-center"
                      >
                        <span className="flex items-center gap-1">
                          <span className="text-2xl">
                            {formatCountryDisplay(
                              country.country || "Unknown",
                              "flag"
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatCountryDisplay(
                              country.country || "Unknown",
                              "name"
                            )}
                          </span>
                        </span>
                        <span className="font-medium">
                          {displayCount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                {(mergedAnalytics?.countryDistribution.length ?? 0) === 0 &&
                  (mergedAnalytics?.totalUniqueVisitors ?? 0) > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">
                          Geographic data is being processed
                        </span>
                        <span className="font-medium">
                          {mergedAnalytics?.totalUniqueVisitors.toLocaleString() ??
                            0}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Check back in a few minutes
                      </p>
                    </div>
                  )}
                {(mergedAnalytics?.countryDistribution.length ?? 0) === 0 &&
                  (mergedAnalytics?.totalUniqueVisitors ?? 0) === 0 && (
                    <span className="text-muted-foreground">
                      No data available
                    </span>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {mergedAnalytics && (
        <AnalyticsOverview data={mergedAnalytics.dailyMetrics} />
      )}

      {/* Country Distribution */}
      {mergedAnalytics && mergedAnalytics.countryDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              Visitor Countries
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Geographic distribution of your digital clone visitors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mergedAnalytics?.countryDistribution
                .slice(0, 10)
                .map((country, index) => {
                  const displayCount =
                    country.count === 0 &&
                    (mergedAnalytics?.totalUniqueVisitors ?? 0) > 0
                      ? mergedAnalytics?.totalUniqueVisitors ?? 0
                      : country.count;
                  const maxCount = Math.max(
                    ...(mergedAnalytics?.countryDistribution.map((c) =>
                      c.count === 0 &&
                      (mergedAnalytics?.totalUniqueVisitors ?? 0) > 0
                        ? mergedAnalytics?.totalUniqueVisitors ?? 0
                        : c.count
                    ) ?? [0])
                  );
                  return (
                    <div
                      key={country.country}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-3xl">
                          {formatCountryDisplay(
                            country.country || "Unknown",
                            "flag"
                          )}
                        </span>
                        <span className="text-sm">
                          {formatCountryDisplay(
                            country.country || "Unknown",
                            "name"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <div className="flex-1 sm:w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                maxCount > 0
                                  ? (displayCount / maxCount) * 100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {displayCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Metrics */}
      <EngagementMetrics
        uniqueId={params.uniqueId}
        startDate={dateRange.startDate.toISOString()}
        endDate={dateRange.endDate.toISOString()}
      />

      {/* Top Questions and Topic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopQuestions uniqueId={params.uniqueId} />
        <TopicBreakdown uniqueId={params.uniqueId} />
      </div>

      {/* Conversations Table */}
      {conversations && <ConversationsTable data={conversations} />}
    </div>
  );
}
