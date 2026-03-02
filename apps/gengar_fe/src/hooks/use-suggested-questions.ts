import { gengarApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch suggested questions for an app (authenticated users)
 * Uses aggressive caching since suggested questions rarely change
 */
export const useSuggestedQuestions = (appUniqueId: string | undefined) => {
  return useQuery({
    queryKey: ["suggested-questions", appUniqueId],
    queryFn: () => gengarApi.getSuggestedQuestions(appUniqueId!),
    enabled: !!appUniqueId,
    staleTime: 1000 * 60 * 15, // 15 minutes - suggested questions rarely change
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection time
    refetchOnMount: false, // Don't refetch on component mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors (app not found)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to fetch suggested questions for a published app (public view)
 * Uses aggressive caching since suggested questions rarely change
 */
export const usePublishedAppSuggestedQuestions = (
  appName: string | undefined
) => {
  return useQuery({
    queryKey: ["published-app-suggested-questions", appName],
    queryFn: () => gengarApi.getPublishedAppSuggestedQuestions(appName!),
    enabled: !!appName,
    staleTime: 1000 * 60 * 15, // 15 minutes - suggested questions rarely change
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection time
    refetchOnMount: false, // Don't refetch on component mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors (app not found)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Default suggested questions to use as fallback
 */
export const DEFAULT_SUGGESTED_QUESTIONS = [
  "What does your typical workday look like?",
  "What recent project are you most proud of?",
  "How do you stay up to date with industry trends?",
  "What advice would you give to someone starting out in your field?",
  "What motivates you to keep pushing forward when things get tough?",
  "What's the most challenging problem you've solved recently?",
];

/**
 * Utility to invalidate suggested questions queries
 */
export const invalidateSuggestedQuestionsQueries = (
  queryClient: any,
  appUniqueId?: string
) => {
  if (appUniqueId) {
    queryClient.invalidateQueries({
      queryKey: ["suggested-questions", appUniqueId],
    });
  } else {
    queryClient.invalidateQueries({ queryKey: ["suggested-questions"] });
  }
};

/**
 * Utility to invalidate published app suggested questions queries
 */
export const invalidatePublishedAppSuggestedQuestionsQueries = (
  queryClient: any,
  appName?: string
) => {
  if (appName) {
    queryClient.invalidateQueries({
      queryKey: ["published-app-suggested-questions", appName],
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: ["published-app-suggested-questions"],
    });
  }
};
