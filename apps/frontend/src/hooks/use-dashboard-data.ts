import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { gengarApi } from "@/services/api";
import { aggregateDailyConversationMetrics } from "@/utils/analytics";

interface AnalyticsData {
  totalPageViews: number;
  totalUniqueVisitors: number;
  totalConversations: number;
  totalMessages: number;
  dailyMetrics: Array<{
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    conversationCount: number;
    messageCount: number;
  }>;
  countryDistribution: Array<{
    country: string;
    count: number;
  }>;
  startDate: string;
  endDate: string;
}

interface ConversationData {
  total: number;
  limit: number;
  offset: number;
  conversations: Array<{
    id: number;
    userId: number;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    lastMessageAt: string;
    user: {
      email: string;
      avatar: string;
    };
    messages: Array<{
      id: number;
      content: string;
      role: string;
      createdAt: string;
    }>;
  }>;
}

/**
 * Hook for fetching app data
 */
export function useAppData(uniqueId: string) {
  const { status } = useSession();

  return useQuery({
    queryKey: ["app", uniqueId],
    queryFn: () => gengarApi.getOfficialApp(uniqueId),
    enabled: status === "authenticated",
  });
}

/**
 * Hook for fetching analytics data
 */
export function useAnalyticsData(
  uniqueId: string,
  startDate: string,
  endDate: string
) {
  const { status } = useSession();

  return useQuery({
    queryKey: ["analytics", uniqueId, startDate, endDate],
    queryFn: () => gengarApi.getAppAnalytics(uniqueId, startDate, endDate),
    enabled: status === "authenticated",
  });
}

/**
 * Hook for fetching conversations data
 */
export function useConversationsData(uniqueId: string) {
  const { status } = useSession();

  return useQuery({
    queryKey: ["conversations", uniqueId],
    queryFn: () => gengarApi.getAppConversations(uniqueId),
    enabled: status === "authenticated",
  });
}

/**
 * Hook for merging analytics and conversation data
 */
export function useMergedAnalytics(
  analytics: AnalyticsData | undefined,
  conversations: ConversationData | undefined,
  dateRange: { startDate: Date; endDate: Date }
): AnalyticsData | undefined {
  return useMemo(() => {
    if (!analytics || !conversations) {
      return analytics;
    }

    const dailyConversationMetrics = aggregateDailyConversationMetrics(
      conversations,
      dateRange.startDate,
      dateRange.endDate
    );

    const merged = {
      ...analytics,
      dailyMetrics: analytics.dailyMetrics.map(
        (analyticsDay: {
          date: string;
          pageViews: number;
          uniqueVisitors: number;
        }) => {
          const conversationDay = dailyConversationMetrics.find(
            (convDay) => convDay.date === analyticsDay.date
          );
          return {
            ...analyticsDay,
            conversationCount: conversationDay?.conversationCount ?? 0,
            messageCount: conversationDay?.messageCount ?? 0,
          };
        }
      ),
    };

    return merged;
  }, [analytics, conversations, dateRange.startDate, dateRange.endDate]);
}

/**
 * Main hook for dashboard data - combines all the above hooks
 */
export function useDashboardData(
  uniqueId: string,
  dateRange: { startDate: Date; endDate: Date }
) {
  const queryClient = useQueryClient();

  // Prepare date strings
  const startDateStr = dateRange.startDate.toISOString().split("T")[0];
  const endDateStr = dateRange.endDate.toISOString().split("T")[0];

  // Fetch data using individual hooks
  const appQuery = useAppData(uniqueId);
  const analyticsQuery = useAnalyticsData(uniqueId, startDateStr, endDateStr);
  const conversationsQuery = useConversationsData(uniqueId);

  // Merge the data
  const mergedAnalytics = useMergedAnalytics(
    analyticsQuery.data,
    conversationsQuery.data,
    dateRange
  );

  // Aggregate loading and error states
  const loading =
    appQuery.isLoading || analyticsQuery.isLoading || conversationsQuery.isLoading;
  const error = appQuery.error || analyticsQuery.error || conversationsQuery.error;

  // Refresh function
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["app", uniqueId] });
    queryClient.invalidateQueries({
      queryKey: ["analytics", uniqueId, startDateStr, endDateStr],
    });
    queryClient.invalidateQueries({ queryKey: ["conversations", uniqueId] });
  };

  return {
    app: appQuery.data,
    analytics: analyticsQuery.data,
    conversations: conversationsQuery.data,
    mergedAnalytics,
    loading,
    error,
    refreshData,
  } as const;
}