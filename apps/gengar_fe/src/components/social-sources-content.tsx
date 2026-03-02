import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { SocialNetworkType } from "@/services/api";
import { SourceDetailsSheet } from "@/components/source-details-sheet";
import { ExternalLink, Code2, Star, GitFork } from "lucide-react";
import { getSocialMediaLink } from "@/utils/social-links";
import { getLanguageColor } from "@/utils/github-languages";
import { useAppResources } from "@/hooks/use-app-resources";

interface SocialSourcesContentProps {
  appId: string;
  sources: Array<{ type: SocialNetworkType; username: string }>;
}

// Helper function to get brand colors for social networks
function getSocialNetworkColors(type: SocialNetworkType): {
  borderColor: string;
  backgroundColor: string;
  hoverBackgroundColor: string;
} {
  switch (type) {
    case SocialNetworkType.FACEBOOK:
      return {
        borderColor: "rgba(24, 119, 242, 0.5)",
        backgroundColor: "rgba(24, 119, 242, 0.1)",
        hoverBackgroundColor: "rgba(24, 119, 242, 0.15)",
      };
    case SocialNetworkType.INSTAGRAM:
      return {
        borderColor: "rgba(228, 64, 95, 0.5)",
        backgroundColor: "rgba(228, 64, 95, 0.1)",
        hoverBackgroundColor: "rgba(228, 64, 95, 0.15)",
      };
    case SocialNetworkType.THREADS:
      return {
        borderColor: "rgba(0, 0, 0, 0.5)",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        hoverBackgroundColor: "rgba(0, 0, 0, 0.15)",
      };
    case SocialNetworkType.LINKEDIN:
      return {
        borderColor: "rgba(10, 102, 194, 0.5)",
        backgroundColor: "rgba(10, 102, 194, 0.1)",
        hoverBackgroundColor: "rgba(10, 102, 194, 0.15)",
      };
    case SocialNetworkType.GMAIL:
      return {
        borderColor: "rgba(234, 67, 53, 0.5)",
        backgroundColor: "rgba(234, 67, 53, 0.1)",
        hoverBackgroundColor: "rgba(234, 67, 53, 0.15)",
      };
    case SocialNetworkType.REDDIT:
      return {
        borderColor: "rgba(255, 69, 0, 0.5)",
        backgroundColor: "rgba(255, 69, 0, 0.1)",
        hoverBackgroundColor: "rgba(255, 69, 0, 0.15)",
      };
    case SocialNetworkType.MEDIUM:
      return {
        borderColor: "rgba(0, 0, 0, 0.5)",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        hoverBackgroundColor: "rgba(0, 0, 0, 0.15)",
      };
    case SocialNetworkType.GITHUB:
      return {
        borderColor: "rgba(36, 41, 46, 0.5)",
        backgroundColor: "rgba(36, 41, 46, 0.1)",
        hoverBackgroundColor: "rgba(36, 41, 46, 0.15)",
      };
    case SocialNetworkType.PRODUCTHUNT:
      return {
        borderColor: "rgba(218, 85, 47, 0.5)",
        backgroundColor: "rgba(218, 85, 47, 0.1)",
        hoverBackgroundColor: "rgba(218, 85, 47, 0.15)",
      };
    case SocialNetworkType.SUBSTACK:
      return {
        borderColor: "rgba(255, 109, 0, 0.5)",
        backgroundColor: "rgba(255, 109, 0, 0.1)",
        hoverBackgroundColor: "rgba(255, 109, 0, 0.15)",
      };
    case SocialNetworkType.GOODREADS:
      return {
        borderColor: "rgba(139, 69, 19, 0.5)",
        backgroundColor: "rgba(139, 69, 19, 0.1)",
        hoverBackgroundColor: "rgba(139, 69, 19, 0.15)",
      };
    default:
      return {
        borderColor: "hsl(var(--border))",
        backgroundColor: "transparent",
        hoverBackgroundColor: "hsl(var(--accent))",
      };
  }
}

// Helper function to get display name for social networks
function getSocialNetworkDisplayName(type: SocialNetworkType): string {
  switch (type) {
    case SocialNetworkType.FACEBOOK:
      return "Facebook";
    case SocialNetworkType.INSTAGRAM:
      return "Instagram";
    case SocialNetworkType.THREADS:
      return "Threads";
    case SocialNetworkType.LINKEDIN:
      return "LinkedIn";
    case SocialNetworkType.GMAIL:
      return "Gmail";
    case SocialNetworkType.REDDIT:
      return "Reddit";
    case SocialNetworkType.MEDIUM:
      return "Medium";
    case SocialNetworkType.GITHUB:
      return "GitHub";
    case SocialNetworkType.PRODUCTHUNT:
      return "Product Hunt";
    case SocialNetworkType.SUBSTACK:
      return "Substack";
    case SocialNetworkType.GOODREADS:
      return "Goodreads";
    default:
      // This should never happen with the current enum, but provides a fallback
      return String(type).charAt(0).toUpperCase() + String(type).slice(1);
  }
}

export function SocialSourcesContent({
  appId,
  sources,
}: SocialSourcesContentProps) {
  const [openSheets, setOpenSheets] = useState<boolean[]>(
    new Array(sources.length).fill(false)
  );

  // Fetch GitHub data to get repository information
  const githubSources = sources.filter(
    (s) => s.type === SocialNetworkType.GITHUB
  );
  const { data: githubData } = useAppResources(
    appId,
    githubSources.length > 0 ? [SocialNetworkType.GITHUB] : [],
    { enabled: githubSources.length > 0 }
  );

  // Get main repository for each GitHub user
  const githubRepos = useMemo(() => {
    const repos: Record<string, any> = {};
    if (githubData && githubData[SocialNetworkType.GITHUB]) {
      githubSources.forEach((source) => {
        const userRepos = githubData[SocialNetworkType.GITHUB]
          .filter((r) => r.type === "repository" && r.metadata)
          .sort((a, b) => {
            // Sort by stars, then by updated date
            const starsA = a.metadata?.stargazers_count || 0;
            const starsB = b.metadata?.stargazers_count || 0;
            if (starsA !== starsB) return starsB - starsA;

            const dateA = new Date(a.metadata?.updated_at || 0).getTime();
            const dateB = new Date(b.metadata?.updated_at || 0).getTime();
            return dateB - dateA;
          });

        if (userRepos.length > 0) {
          repos[source.username] = userRepos[0];
        }
      });
    }
    return repos;
  }, [githubData, githubSources]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {sources.map((source, i) => {
        const colors = getSocialNetworkColors(source.type);
        return (
          <div key={i} className="w-full">
            <div
              className="flex items-center gap-2 px-3 py-1.5 transition-all duration-200 cursor-pointer w-full justify-between h-16 rounded-md border"
              style={{
                borderColor: colors.borderColor,
                backgroundColor: colors.backgroundColor,
                borderWidth: "1px",
                borderStyle: "solid",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  colors.hoverBackgroundColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.backgroundColor;
              }}
              onClick={() => {
                const newOpenSheets = [...openSheets];
                newOpenSheets[i] = true;
                setOpenSheets(newOpenSheets);
              }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <img
                  src={`/icons/${source.type.toLowerCase()}.svg`}
                  alt={source.type}
                  className="w-5 h-5 flex-shrink-0"
                />
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-xs font-medium text-foreground">
                    {getSocialNetworkDisplayName(source.type)}
                  </span>
                  {source.type === SocialNetworkType.GITHUB &&
                  githubRepos[source.username] ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                      <span className="truncate">@{source.username}</span>
                      {githubRepos[source.username].metadata?.language && (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: getLanguageColor(
                                githubRepos[source.username].metadata.language
                              ),
                            }}
                          />
                          <span className="truncate">
                            {githubRepos[source.username].metadata.language}
                          </span>
                        </div>
                      )}
                      {githubRepos[source.username].metadata?.stargazers_count >
                        0 && (
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3" />
                          <span>
                            {
                              githubRepos[source.username].metadata
                                .stargazers_count
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground truncate w-full">
                      @{source.username}
                    </span>
                  )}
                </div>
              </div>
              {/* Direct profile link for GitHub */}
              {source.type === SocialNetworkType.GITHUB && (
                <a
                  href={`https://github.com/${source.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <SourceDetailsSheet
              appId={appId}
              source={source.type}
              username={source.username}
              isOpen={openSheets[i]}
              onOpenChange={(open) => {
                const newOpenSheets = [...openSheets];
                newOpenSheets[i] = open;
                setOpenSheets(newOpenSheets);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
