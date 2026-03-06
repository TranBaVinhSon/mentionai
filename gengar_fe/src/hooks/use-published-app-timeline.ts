import { gengarApi } from "@/services/api";
import { useInfiniteQuery } from "@tanstack/react-query";

export const usePublishedAppTimeline = (
  appName?: string,
  source?: string,
  limit: number = 20
) => {
  return useInfiniteQuery({
    queryKey: ["published-app-timeline", appName, source, limit],
    queryFn: ({ pageParam = 1 }) =>
      gengarApi.getPublishedAppTimeline(appName!, pageParam, limit, source),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!appName,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if ((error as any)?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};
