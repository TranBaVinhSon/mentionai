import { gengarApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch the about content for a published digital clone
 */
export const usePublishedAppAbout = (appName?: string) => {
  return useQuery({
    queryKey: ["published-app-about", appName],
    queryFn: () => gengarApi.getPublishedAppAbout(appName!),
    enabled: !!appName,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};
