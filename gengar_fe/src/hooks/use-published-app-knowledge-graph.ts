import { gengarApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const usePublishedAppKnowledgeGraph = (appName?: string) => {
  return useQuery({
    queryKey: ["published-app-knowledge-graph", appName],
    queryFn: () => gengarApi.getPublishedAppKnowledgeGraph(appName!),
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
