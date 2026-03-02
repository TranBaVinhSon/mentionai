import { App, gengarApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export const usePublishedDigitalClones = () => {
  const {
    data: digitalClones,
    isLoading,
    error,
  } = useQuery<App[]>({
    queryKey: ["published-digital-clones"],
    queryFn: () => gengarApi.getPublishedDigitalClones(),
    staleTime: 60 * 1000 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  return {
    digitalClones: digitalClones || [],
    isLoading,
    error,
  };
};
