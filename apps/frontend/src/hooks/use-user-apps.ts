import { App, gengarApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export const useUserApps = () => {
  const { status } = useSession();

  const query = useQuery<App[]>({
    queryKey: ["user-apps", status],
    queryFn: async () => {
      return gengarApi.getYourApps();
    },
    enabled: status === "authenticated",
    staleTime: 60 * 1000 * 5, // 5 minutes
  });

  return query;
};
