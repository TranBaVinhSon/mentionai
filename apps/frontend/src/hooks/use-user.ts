import { gengarApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export const useUser = () => {
  const { status } = useSession();

  const query = useQuery({
    queryKey: ["profile"],
    queryFn: () => {
      return gengarApi.getProfile();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - user profile changes less frequently
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection time
    refetchOnMount: false, // Don't refetch on component mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: status === "authenticated",
  });

  return query;
};

// Add this new export
export const invalidateUserQuery = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: ["profile", "authenticated"] });
};
