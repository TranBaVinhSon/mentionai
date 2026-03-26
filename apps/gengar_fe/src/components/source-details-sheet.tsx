import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SocialNetworkType } from "@/services/api";
import { useAppResources } from "@/hooks/use-app-resources";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { getSocialMediaLink } from "@/utils/social-links";
import { getLanguageColor } from "@/utils/github-languages";
import {
  Star,
  GitFork,
  Clock,
  MapPin,
  Building,
  Globe,
  Mail,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  Users,
  FileText,
  Eye,
  MessageCircle,
  ArrowUp,
  Trophy,
  Rocket,
  Target,
  Heart,
  ThumbsUp,
  Repeat2,
  Lightbulb,
  PartyPopper,
  Paperclip,
} from "lucide-react";
import {
  isMarkdownContent,
  isHtmlContent,
  cleanContent,
} from "@/utils/markdown";
import { MemoizedReactMarkdown } from "@/components/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SourceDetailsSheetProps {
  appId: string;
  source: SocialNetworkType;
  username: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SourceDetailsSheet({
  appId,
  source,
  username,
  isOpen,
  onOpenChange,
}: SourceDetailsSheetProps) {
  // Only fetch data when sheet is open
  const { data, isLoading } = useAppResources(appId, [source], {
    enabled: isOpen,
  });

  const resources = data?.[source] ?? [];
  const filteredResources = resources?.filter(
    (resource) =>
      resource.content?.trim() ||
      (source === "producthunt" && resource.type === "product")
  );
  // Sort with Profile first, then ProductHunt launched products, then by time
  const sortedResources = [...filteredResources]?.sort((a, b) => {
    // Always put profile first
    if (a.type === "profile" && b.type !== "profile") return -1;
    if (a.type !== "profile" && b.type === "profile") return 1;

    // For ProductHunt: prioritize launched products after profile
    if (
      source === "producthunt" &&
      a.type !== "profile" &&
      b.type !== "profile"
    ) {
      const aIsLaunched = a.metadata?.productType === "launched";
      const bIsLaunched = b.metadata?.productType === "launched";

      if (aIsLaunched && !bIsLaunched) return -1;
      if (!aIsLaunched && bIsLaunched) return 1;
    }

    // Then sort by time (most recent first, nulls last)
    const aTime = a.socialContentCreatedAt
      ? new Date(a.socialContentCreatedAt).getTime()
      : -Infinity;
    const bTime = b.socialContentCreatedAt
      ? new Date(b.socialContentCreatedAt).getTime()
      : -Infinity;
    return bTime - aTime;
  });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-hidden flex flex-col">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate max-w-[200px] text-base">
                    @{username}
                  </span>
                </TooltipTrigger>
                <TooltipContent>@{username}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-full h-24" />
              ))}
            </div>
          ) : sortedResources.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No content available
            </div>
          ) : (
            <div className="space-y-4">
              {sortedResources.map((resource) => (
                <div
                  key={resource.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={`/icons/${source.toLowerCase()}.svg`}
                        alt={source}
                        className="w-4 h-4"
                      />
                      <Badge variant="outline" className="text-xs capitalize">
                        {resource.type}
                      </Badge>
                    </div>
                    {resource.type !== "book" && (
                      <a
                        href={
                          // Use metadata.html_url if available (for GitHub), otherwise use getSocialMediaLink
                          resource.metadata?.html_url ||
                          getSocialMediaLink(
                            source,
                            resource.type,
                            resource.externalId,
                            resource.metadata
                          )
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* GitHub Repository/Profile Metadata */}
                  {source === "github" && resource.metadata && (
                    <div className="mb-3">
                      {(resource.type === "repository" ||
                        resource.type === "post") && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {resource.metadata.language && (
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: getLanguageColor(
                                      resource.metadata.language
                                    ),
                                  }}
                                />
                                <span>{resource.metadata.language}</span>
                              </div>
                            )}
                            {resource.metadata.stargazers_count > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                <span>
                                  {resource.metadata.stargazers_count}
                                </span>
                              </div>
                            )}
                            {resource.metadata.forks_count > 0 && (
                              <div className="flex items-center gap-1">
                                <GitFork className="w-3 h-3" />
                                <span>{resource.metadata.forks_count}</span>
                              </div>
                            )}
                            {/* {resource.metadata.updated_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Updated{" "}
                                  {new Date(
                                    resource.metadata.updated_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )} */}
                          </div>
                          {resource.metadata.topics &&
                            resource.metadata.topics.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {resource.metadata.topics.map(
                                  (topic: string) => (
                                    <Badge
                                      key={topic}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {topic}
                                    </Badge>
                                  )
                                )}
                              </div>
                            )}
                          {/* {resource.metadata.clone_url && (
                            <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                              git clone {resource.metadata.clone_url}
                            </div>
                          )} */}
                        </div>
                      )}

                      {resource.type === "profile" && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {resource.metadata.name && (
                              <div>
                                <strong>Name:</strong> {resource.metadata.name}
                              </div>
                            )}
                            {resource.metadata.company && (
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                <span>{resource.metadata.company}</span>
                              </div>
                            )}
                            {resource.metadata.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{resource.metadata.location}</span>
                              </div>
                            )}
                            {resource.metadata.blog && (
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <a
                                  href={resource.metadata.blog}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  Website
                                </a>
                              </div>
                            )}
                            {resource.metadata.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>{resource.metadata.email}</span>
                              </div>
                            )}
                            {resource.metadata.created_at && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  Joined{" "}
                                  {new Date(
                                    resource.metadata.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              <strong>
                                {resource.metadata.public_repos || 0}
                              </strong>{" "}
                              repositories
                            </span>
                            <span>
                              <strong>
                                {resource.metadata.followers || 0}
                              </strong>{" "}
                              followers
                            </span>
                            <span>
                              <strong>
                                {resource.metadata.following || 0}
                              </strong>{" "}
                              following
                            </span>
                          </div>
                          {resource.metadata.bio && (
                            <div className="text-sm italic text-muted-foreground">
                              &quot;{resource.metadata.bio}&quot;
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Medium Metadata */}
                  {source === "medium" && resource.metadata && (
                    <div className="mb-3">
                      {resource.type === "post" && (
                        <div className="space-y-2">
                          {resource.metadata.title && (
                            <div className="font-medium text-sm">
                              {resource.metadata.title}
                            </div>
                          )}

                          {resource.metadata.publishDate && (
                            <div className="text-xs text-muted-foreground">
                              Published on{" "}
                              {new Date(
                                resource.metadata.publishDate
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Substack Metadata */}
                  {source === "substack" && resource.metadata && (
                    <div className="mb-3">
                      {resource.type === "post" && (
                        <div className="space-y-2">
                          {resource.metadata.title && (
                            <div className="font-medium text-sm">
                              {resource.metadata.title}
                            </div>
                          )}

                          {resource.metadata.publishDate && (
                            <div className="text-xs text-muted-foreground">
                              Published on{" "}
                              {new Date(
                                resource.metadata.publishDate
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LinkedIn Metadata */}
                  {source === "linkedin" && resource.metadata && (
                    <div className="mb-3">
                      {resource.type === "profile" && (
                        <div className="space-y-3">
                          {/* Profile Header */}
                          {(resource.metadata.fullName ||
                            resource.metadata.headline) && (
                            <div className="space-y-1">
                              {resource.metadata.fullName && (
                                <div className="font-semibold text-base">
                                  {resource.metadata.fullName}
                                </div>
                              )}
                              {resource.metadata.headline && (
                                <div className="text-sm text-muted-foreground">
                                  {resource.metadata.headline}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Location and Connections */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {resource.metadata.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{resource.metadata.location}</span>
                              </div>
                            )}
                            {resource.metadata.connections && (
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>
                                  {resource.metadata.connections} connections
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Professional Summary */}
                          {resource.metadata.summary && (
                            <div className="p-3 bg-muted/30 rounded-md">
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                Professional Summary
                              </div>
                              <div className="text-sm">
                                {resource.metadata.summary}
                              </div>
                            </div>
                          )}

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            {resource.metadata.experienceCount > 0 && (
                              <div className="text-center p-2 bg-muted/20 rounded">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                  <Briefcase className="w-3 h-3" />
                                </div>
                                <div className="font-medium">
                                  {resource.metadata.experienceCount}
                                </div>
                                <div className="text-muted-foreground">
                                  Experience
                                </div>
                              </div>
                            )}
                            {resource.metadata.educationCount > 0 && (
                              <div className="text-center p-2 bg-muted/20 rounded">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                  <GraduationCap className="w-3 h-3" />
                                </div>
                                <div className="font-medium">
                                  {resource.metadata.educationCount}
                                </div>
                                <div className="text-muted-foreground">
                                  Education
                                </div>
                              </div>
                            )}
                            {resource.metadata.certificationsCount > 0 && (
                              <div className="text-center p-2 bg-muted/20 rounded">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                  <Award className="w-3 h-3" />
                                </div>
                                <div className="font-medium">
                                  {resource.metadata.certificationsCount}
                                </div>
                                <div className="text-muted-foreground">
                                  Certificates
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Additional Accomplishments */}
                          {(resource.metadata.publicationsCount > 0 ||
                            resource.metadata.projectsCount > 0 ||
                            resource.metadata.honorsAwardsCount > 0) && (
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              {resource.metadata.publicationsCount > 0 && (
                                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                                    <FileText className="w-3 h-3" />
                                  </div>
                                  <div className="font-medium">
                                    {resource.metadata.publicationsCount}
                                  </div>
                                  <div className="text-muted-foreground">
                                    Publications
                                  </div>
                                </div>
                              )}
                              {resource.metadata.projectsCount > 0 && (
                                <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded">
                                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                                    <Briefcase className="w-3 h-3" />
                                  </div>
                                  <div className="font-medium">
                                    {resource.metadata.projectsCount}
                                  </div>
                                  <div className="text-muted-foreground">
                                    Projects
                                  </div>
                                </div>
                              )}
                              {resource.metadata.honorsAwardsCount > 0 && (
                                <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded">
                                  <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400">
                                    <Award className="w-3 h-3" />
                                  </div>
                                  <div className="font-medium">
                                    {resource.metadata.honorsAwardsCount}
                                  </div>
                                  <div className="text-muted-foreground">
                                    Awards
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* LinkedIn Post/Article Metadata */}
                      {(resource.type === "post" ||
                        resource.metadata.isArticle) && (
                        <div className="space-y-2">
                          {resource.metadata.title && (
                            <div className="font-medium text-sm">
                              {resource.metadata.title}
                            </div>
                          )}

                          {/* Engagement Metrics - Support both old and new format */}
                          {(resource.metadata.engagement ||
                            resource.metadata.stats ||
                            resource.metadata.likes !== undefined) && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {/* New Apify format with detailed stats */}
                              {resource.metadata.stats && (
                                <>
                                  {/* Show total reactions if available */}
                                  {resource.metadata.stats.total_reactions >
                                    0 && (
                                    <div className="flex items-center gap-1">
                                      <Heart className="w-3 h-3" />
                                      <span>
                                        {
                                          resource.metadata.stats
                                            .total_reactions
                                        }
                                      </span>
                                    </div>
                                  )}
                                  {/* Individual reaction counts */}
                                  {resource.metadata.stats.like > 0 && (
                                    <div className="flex items-center gap-1">
                                      <ThumbsUp className="w-3 h-3" />
                                      <span>
                                        {resource.metadata.stats.like}
                                      </span>
                                    </div>
                                  )}
                                  {resource.metadata.stats.comments > 0 && (
                                    <div className="flex items-center gap-1">
                                      <MessageCircle className="w-3 h-3" />
                                      <span>
                                        {resource.metadata.stats.comments}
                                      </span>
                                    </div>
                                  )}
                                  {resource.metadata.stats.reposts > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Repeat2 className="w-3 h-3" />
                                      <span>
                                        {resource.metadata.stats.reposts}
                                      </span>
                                    </div>
                                  )}
                                  {/* Additional reaction types from Apify */}
                                  {resource.metadata.stats.love > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Heart className="w-3 h-3" />
                                      <span>
                                        {resource.metadata.stats.love}
                                      </span>
                                    </div>
                                  )}
                                  {resource.metadata.stats.insight > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Lightbulb className="w-3 h-3" />
                                      <span>
                                        {resource.metadata.stats.insight}
                                      </span>
                                    </div>
                                  )}
                                  {resource.metadata.stats.celebrate > 0 && (
                                    <div className="flex items-center gap-1">
                                      <PartyPopper className="w-3 h-3" />
                                      <span>
                                        {resource.metadata.stats.celebrate}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                              {/* Legacy format */}
                              {resource.metadata.engagement &&
                                !resource.metadata.stats && (
                                  <>
                                    {resource.metadata.engagement.likes > 0 && (
                                      <div className="flex items-center gap-1">
                                        <ThumbsUp className="w-3 h-3" />
                                        <span>
                                          {resource.metadata.engagement.likes}
                                        </span>
                                      </div>
                                    )}
                                    {resource.metadata.engagement.comments >
                                      0 && (
                                      <div className="flex items-center gap-1">
                                        <MessageCircle className="w-3 h-3" />
                                        <span>
                                          {
                                            resource.metadata.engagement
                                              .comments
                                          }
                                        </span>
                                      </div>
                                    )}
                                    {resource.metadata.engagement.shares >
                                      0 && (
                                      <div className="flex items-center gap-1">
                                        <Repeat2 className="w-3 h-3" />
                                        <span>
                                          {resource.metadata.engagement.shares}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              {/* Individual metrics fallback */}
                              {!resource.metadata.stats &&
                                !resource.metadata.engagement && (
                                  <>
                                    {resource.metadata.likes > 0 && (
                                      <div className="flex items-center gap-1">
                                        <ThumbsUp className="w-3 h-3" />
                                        <span>{resource.metadata.likes}</span>
                                      </div>
                                    )}
                                    {resource.metadata.comments > 0 && (
                                      <div className="flex items-center gap-1">
                                        <MessageCircle className="w-3 h-3" />
                                        <span>
                                          {resource.metadata.comments}
                                        </span>
                                      </div>
                                    )}
                                    {resource.metadata.shares > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Repeat2 className="w-3 h-3" />
                                        <span>{resource.metadata.shares}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                            </div>
                          )}

                          {/* Content Type Indicators */}
                          <div className="flex items-center gap-2">
                            {resource.metadata.isArticle && (
                              <Badge variant="secondary" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                Article
                              </Badge>
                            )}
                            {resource.metadata.fetchedVia && (
                              <Badge variant="outline" className="text-xs">
                                {resource.metadata.fetchedVia}
                              </Badge>
                            )}
                          </div>

                          {/* Media Indicators */}
                          {resource.metadata.media &&
                            resource.metadata.media.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Paperclip className="w-3 h-3" />
                                <span>
                                  {resource.metadata.media.length} media
                                  attachment(s)
                                </span>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ProductHunt Metadata */}
                  {source === "producthunt" && resource.metadata && (
                    <div className="mb-3">
                      {resource.type === "profile" && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
                              <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400">
                                <Rocket className="w-3 h-3" />
                              </div>
                              <div className="font-medium">
                                {resource.metadata.makerOfCount || 0}
                              </div>
                              <div className="text-muted-foreground">
                                Launched
                              </div>
                            </div>
                            <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
                              <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400">
                                <Target className="w-3 h-3" />
                              </div>
                              <div className="font-medium">
                                {resource.metadata.hunterOfCount || 0}
                              </div>
                              <div className="text-muted-foreground">
                                Hunted
                              </div>
                            </div>
                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                              <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                                <ArrowUp className="w-3 h-3" />
                              </div>
                              <div className="font-medium">
                                {resource.metadata.votedPostsCount || 0}
                              </div>
                              <div className="text-muted-foreground">
                                Upvoted
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {resource.type === "product" && (
                        <div className="space-y-3">
                          {/* Product Header */}
                          <div className="flex items-start gap-3">
                            {resource.metadata.thumbnail && (
                              <div className="flex-shrink-0">
                                <img
                                  src={resource.metadata.thumbnail}
                                  alt={resource.metadata.productName}
                                  className="w-12 h-12 rounded-lg object-cover border"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    resource.metadata.productType === "launched"
                                      ? "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200"
                                      : resource.metadata.productType ===
                                        "hunted"
                                      ? "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200"
                                      : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200"
                                  }`}
                                >
                                  {resource.metadata.productType ===
                                    "launched" && (
                                    <Rocket className="w-3 h-3 mr-1" />
                                  )}
                                  {resource.metadata.productType ===
                                    "hunted" && (
                                    <Target className="w-3 h-3 mr-1" />
                                  )}
                                  {resource.metadata.productType ===
                                    "upvoted" && (
                                    <ArrowUp className="w-3 h-3 mr-1" />
                                  )}
                                  {resource.metadata.productType === "launched"
                                    ? "Launched"
                                    : resource.metadata.productType === "hunted"
                                    ? "Hunted"
                                    : "Upvoted"}
                                </Badge>
                                {resource.metadata.featured && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200"
                                  >
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm font-medium text-foreground mb-1">
                                {resource.metadata.productName}
                              </div>
                              {resource.metadata.tagline && (
                                <div className="text-xs text-muted-foreground">
                                  {resource.metadata.tagline}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Engagement Metrics */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {resource.metadata.votesCount > 0 && (
                              <div className="flex items-center gap-1">
                                <ArrowUp className="w-3 h-3" />
                                <span className="font-medium">
                                  {resource.metadata.votesCount}
                                </span>
                                <span>votes</span>
                              </div>
                            )}
                            {resource.metadata.commentsCount > 0 && (
                              <div className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                <span className="font-medium">
                                  {resource.metadata.commentsCount}
                                </span>
                                <span>comments</span>
                              </div>
                            )}
                          </div>

                          {/* Topics */}
                          {resource.metadata.topics &&
                            resource.metadata.topics.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {resource.metadata.topics.map((topic: any) => (
                                  <Badge
                                    key={topic.id || topic.name}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {topic.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-sm">
                    {source === "producthunt" &&
                    resource.type === "product" ? null : resource.type === // For ProductHunt products, content is already displayed in metadata section above
                      "book" ? (
                      <div className="flex gap-4">
                        {(() => {
                          try {
                            const bookData = JSON.parse(resource.content);
                            return (
                              <>
                                <div className="flex-shrink-0">
                                  <img
                                    src={bookData.book.image}
                                    alt={bookData.book.title}
                                    className="w-20 h-auto rounded-md shadow-md hover:shadow-lg transition-shadow"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div>
                                    <h3 className="font-medium text-base mb-1 line-clamp-2">
                                      {bookData.book.title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200/50"
                                      >
                                        {bookData.action || "Added to library"}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(
                                          bookData.timestamp
                                        ).toLocaleDateString("en-US", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  <a
                                    href={bookData.book.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline group"
                                  >
                                    <img
                                      src="/icons/goodreads.svg"
                                      alt="Goodreads"
                                      className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity"
                                    />
                                    View on Goodreads
                                  </a>
                                </div>
                              </>
                            );
                          } catch (e) {
                            return <div>Invalid book data</div>;
                          }
                        })()}
                      </div>
                    ) : isHtmlContent(resource.content) ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none break-words overflow-hidden [&_p]:mb-3 [&_p:last-child]:mb-0 [&_h1]:mb-2 [&_h1]:mt-0 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:mb-3 [&_ul]:mt-0 [&_ul]:pl-4 [&_ol]:mb-3 [&_ol]:mt-0 [&_ol]:pl-4 [&_li]:mb-1 [&_blockquote]:mb-3 [&_blockquote]:mt-0 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:bg-slate-100 [&_code]:dark:bg-slate-800 [&_code]:text-slate-900 [&_code]:dark:text-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:break-all [&_pre]:bg-slate-100 [&_pre]:dark:bg-slate-800 [&_pre]:text-slate-900 [&_pre]:dark:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-hidden [&_pre]:break-words [&_pre]:whitespace-pre-wrap [&_pre_code]:break-all [&_pre_code]:whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: cleanContent(resource.content),
                        }}
                      />
                    ) : isMarkdownContent(resource.content) ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-hidden [&_p]:mb-3 [&_p:last-child]:mb-0 [&_h1]:mb-2 [&_h1]:mt-0 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:mb-3 [&_ul]:mt-0 [&_ul]:pl-4 [&_ol]:mb-3 [&_ol]:mt-0 [&_ol]:pl-4 [&_li]:mb-1 [&_blockquote]:mb-3 [&_blockquote]:mt-0 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-slate-100 [&_code]:dark:bg-slate-800 [&_code]:text-slate-900 [&_code]:dark:text-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:break-all [&_pre]:bg-slate-100 [&_pre]:dark:bg-slate-800 [&_pre]:text-slate-900 [&_pre]:dark:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-hidden [&_pre]:break-words [&_pre]:whitespace-pre-wrap [&_pre_code]:break-all [&_pre_code]:whitespace-pre-wrap">
                        <MemoizedReactMarkdown>
                          {cleanContent(resource.content)}
                        </MemoizedReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words overflow-hidden">
                        {cleanContent(resource.content)}
                      </div>
                    )}
                  </div>
                  {resource.socialContentCreatedAt && (
                    <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      {new Date(
                        resource.socialContentCreatedAt
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
