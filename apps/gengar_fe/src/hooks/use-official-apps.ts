import { App, gengarApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export const useOfficialApps = () => {
  const { status } = useSession();

  const { data: apps, isLoading } = useQuery<App[]>({
    queryKey: ["official-apps", status],
    queryFn: async () => {
      if (status === "authenticated") {
        // Fetch both official and personal apps in parallel
        const [officialApps, personalApps] = await Promise.all([
          gengarApi.getOfficialApps(),
          gengarApi.getYourApps(),
        ]);

        // Combine and deduplicate apps
        // Personal apps take precedence over official apps with the same uniqueId
        const personalAppIds = new Set(personalApps.map((app) => app.uniqueId));
        const filteredOfficialApps = officialApps.filter(
          (app) => !personalAppIds.has(app.uniqueId)
        );

        return [...personalApps, ...filteredOfficialApps];
      }
      // If not authenticated, just return official apps
      return gengarApi.getOfficialApps();
    },
    staleTime: 1000 * 60 * 15, // 15 minutes - apps list rarely changes
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection time
    refetchOnMount: false, // Don't refetch on component mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  useEffect(() => {
    if (apps && apps.length > 0) {
      if (typeof window !== "undefined") {
        if (!window.appUniqueIds) {
          window.appUniqueIds = {};
        }
        apps.forEach((app) => {
          if (app.name && app.uniqueId) {
            window.appUniqueIds![app.name] = app.uniqueId;
          }
          if (app.displayName && app.uniqueId) {
            window.appUniqueIds![app.displayName] = app.uniqueId;
          }
        });
      }
    }
  }, [apps]);

  return { apps, isLoading };
};
