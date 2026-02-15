import { gengarApi, App } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch a published digital clone by username
 * Uses aggressive caching since published apps rarely change
 */
export const usePublishedApp = (username: string) => {
  return useQuery({
    queryKey: ["published-app", username],
    queryFn: () => gengarApi.getPublishedApp(username),
    enabled: !!username,
    staleTime: 1000 * 60 * 15, // 15 minutes - published apps rarely change
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
 * Hook to fetch an official app by ID
 * Uses aggressive caching since official apps rarely change
 */
export const useOfficialApp = (appId: string) => {
  return useQuery({
    queryKey: ["official-app", appId],
    queryFn: () => gengarApi.getOfficialApp(appId),
    enabled: !!appId,
    staleTime: 1000 * 60 * 15, // 15 minutes - official apps rarely change
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
 * Utility to invalidate digital clone queries
 */
export const invalidateDigitalCloneQueries = (
  queryClient: any,
  username?: string
) => {
  if (username) {
    queryClient.invalidateQueries({ queryKey: ["published-app", username] });
  } else {
    queryClient.invalidateQueries({ queryKey: ["published-app"] });
  }
};

/**
 * Utility to invalidate official app queries
 */
export const invalidateOfficialAppQueries = (
  queryClient: any,
  appId?: string
) => {
  if (appId) {
    queryClient.invalidateQueries({ queryKey: ["official-app", appId] });
  } else {
    queryClient.invalidateQueries({ queryKey: ["official-app"] });
  }
};
