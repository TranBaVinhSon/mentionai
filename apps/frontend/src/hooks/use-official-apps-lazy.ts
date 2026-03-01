import { App, gengarApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export const useOfficialAppsLazy = (enabled: boolean = false) => {
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
    staleTime: 60 * 1000 * 5,
    enabled: enabled, // Only fetch when enabled is true
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