import { useQueries } from "@tanstack/react-query";
import {
  SocialContent,
  SocialContentType,
  SocialNetworkType,
  gengarApi,
} from "@/services/api";

interface UseAppResourcesOptions {
  enabled?: boolean;
  suspense?: boolean;
}

export function useAppResources(
  appId: string,
  sources: SocialNetworkType[] = Object.values(SocialNetworkType),
  options: UseAppResourcesOptions = {}
) {
  const { enabled = true, suspense = false } = options;

  const queries = useQueries({
    queries: sources.map((source) => ({
      queryKey: ["app-resources", appId, source],
      queryFn: () => gengarApi.getAppResources(appId, source),
      enabled: enabled && !!appId,
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      suspense,
    })),
  });

  const isLoading = queries.some((query) => query.isLoading);
  const error = queries.find((query) => query.error)?.error as Error | null;

  // Combine all data into a Record<SocialContentType, SocialContent[]>
  const data = sources.reduce((acc, source, index) => {
    acc[source] = queries[index].data || [];
    return acc;
  }, {} as Record<SocialNetworkType, SocialContent[]>);

  // Helper to get data for a specific source
  const getSourceData = (source: SocialNetworkType) => data[source] || [];

  // Refetch all queries
  const refetch = () => {
    queries.forEach((query) => query.refetch());
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    getSourceData,
  };
}
