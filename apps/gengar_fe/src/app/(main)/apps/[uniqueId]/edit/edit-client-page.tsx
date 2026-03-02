"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Loader2,
  SquareCheckBig,
  X,
  Link as LinkIcon,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  gengarApi,
  GengarSubscriptionPlan,
  SocialNetworkType,
  UpdateAppBody,
  App,
} from "@/services/api";
import { useUser } from "@/hooks/use-user";
import {
  absoluteUrl,
  cn,
  buildFacebookUrl,
  buildInstagramUrl,
  buildThreadsUrl,
  buildRedditUrl,
  buildProductHuntUrl,
  buildGitHubUrl,
} from "@/lib/utils";
import { SUGGESTED_QUESTION_MAX_LENGTH } from "@/utils/constants";
import { openOAuthPopup, OAuthResult } from "@/utils/oauth-popup";
import { uploadFile } from "@/app/actions/s3-actions";
import { signIn } from "next-auth/react";
import { toast } from "@/hooks/use-toast";
import { setSubscriptionDialog } from "@/store/app";
import { MediumConnectDialog } from "@/components/medium-connect-dialog";
import { SubstackConnectDialog } from "@/components/substack-connect-dialog";
import { LinkedInConnectDialog } from "@/components/linkedin-connect-dialog";
import { TwitterConnectDialog } from "@/components/twitter-connect-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { GoodreadsConnectDialog } from "@/components/goodreads-connect-dialog";
import { AppPreview } from "@/components/app-preview";
import { BasicInformationSection } from "@/components/app-creation/basic-information-section";
import { AiConfigurationSection } from "@/components/app-creation/ai-configuration-section";
import { SuggestedQuestionsSection } from "@/components/app-creation/suggested-questions-section";
import { KnowledgeSourcesSection } from "@/components/app-creation/knowledge-sources-section";
import { PublishingSettingsSection } from "@/components/app-creation/publishing-settings-section";
import { MobileFormSections } from "@/components/app-creation/mobile/mobile-form-sections";
import { ConnectedSourcesList } from "@/components/app-creation/connected-sources-list";
import { useConnectedSourcesStore } from "@/store/connected-sources";
import { UpgradeDialog } from "@/components/shared/upgrade-dialog";
import { useOfficialApp } from "@/hooks/use-digital-clone";
import { useSession } from "next-auth/react";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Enhanced form schema for edit page
const agentFormSchema = z.object({
  name: z.string().min(2, {
    message: "Unique name must be at least 2 characters.",
  }),
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }),
  description: z
    .string()
    .min(10, {
      message: "Description must be at least 10 characters.",
    })
    .optional(),
  instruction: z.string().min(10, {
    message: "System instruction must be at least 10 characters.",
  }),
  logo: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .webp and .gif formats are supported."
    )
    .optional(),
  capabilities: z.object({
    webSearch: z.boolean().default(false),
    imageGeneration: z.boolean().default(false),
  }),
  blogLinks: z.array(z.string().url("Please enter a valid URL")).optional(),
  suggestedQuestions: z
    .object({
      questions: z.array(z.string().min(1, "Question cannot be empty")),
    })
    .optional(),
  isPublished: z.boolean().default(false).optional(),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

// Available social networks for the edit page
const AVAILABLE_SOCIAL_NETWORKS = [
  {
    type: SocialNetworkType.FACEBOOK,
    name: "Facebook",
    icon: "/icons/facebook.svg",
  },
  {
    type: SocialNetworkType.INSTAGRAM,
    name: "Instagram",
    icon: "/icons/instagram.svg",
  },
  {
    type: SocialNetworkType.LINKEDIN,
    name: "LinkedIn",
    icon: "/icons/linkedin.svg",
  },
  {
    type: SocialNetworkType.TWITTER,
    name: "Twitter",
    icon: "/icons/twitter.svg",
  },
  {
    type: SocialNetworkType.THREADS,
    name: "Threads",
    icon: "/icons/threads.svg",
  },
  { type: SocialNetworkType.GMAIL, name: "Gmail", icon: "/icons/gmail.svg" },
  { type: SocialNetworkType.REDDIT, name: "Reddit", icon: "/icons/reddit.svg" },
  { type: SocialNetworkType.MEDIUM, name: "Medium", icon: "/icons/medium.svg" },
  {
    type: SocialNetworkType.SUBSTACK,
    name: "Substack",
    icon: "/icons/substack.svg",
  },
  { type: SocialNetworkType.GITHUB, name: "GitHub", icon: "/icons/github.svg" },
  {
    type: SocialNetworkType.GOODREADS,
    name: "Goodreads",
    icon: "/icons/goodreads.svg",
  },
  {
    type: SocialNetworkType.PRODUCTHUNT,
    name: "Product Hunt",
    icon: "/icons/producthunt.svg",
  },
];

interface EditAgentFormProps {
  uniqueId: string;
}

export default function EditAgentForm({ uniqueId }: EditAgentFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [blogInput, setBlogInput] = useState("");

  // Check session status - edit page requires authentication
  const { status: sessionStatus } = useSession();

  // Use React Query hook for fetching app data (same as client-page.tsx)
  // Only enable the query when the user is authenticated
  const {
    data: currentApp,
    isLoading: appLoading,
    error: appError,
  } = useOfficialApp(sessionStatus === "authenticated" ? uniqueId : "");

  // Combined loading state - wait for both session and app data
  const isLoading = sessionStatus === "loading" || appLoading;
  const [blogLinks, setBlogLinks] = useState<string[]>([]);

  // Social connections state - for the knowledge sources component
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [threadsConnected, setThreadsConnected] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [redditConnected, setRedditConnected] = useState(false);
  const [mediumConnected, setMediumConnected] = useState(false);
  const [substackConnected, setSubstackConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [goodreadsConnected, setGoodreadsConnected] = useState(false);
  const [productHuntConnected, setProductHuntConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);

  // Dialog states
  const [mediumDialogOpen, setMediumDialogOpen] = useState(false);
  const [substackDialogOpen, setSubstackDialogOpen] = useState(false);
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false);
  const [twitterDialogOpen, setTwitterDialogOpen] = useState(false);
  const [goodreadsDialogOpen, setGoodreadsDialogOpen] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Social credentials management
  const [socialCredentials, setSocialCredentials] = useState<
    Array<{
      code?: string;
      username?: string;
      source: SocialNetworkType;
    }>
  >([]);
  const [currentOAuthPlatform, setCurrentOAuthPlatform] =
    useState<SocialNetworkType | null>(null);

  // Collapsible states for sections
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [aiConfigOpen, setAiConfigOpen] = useState(true);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const [knowledgeOpen, setKnowledgeOpen] = useState(true);
  const [publishingOpen, setPublishingOpen] = useState(true);

  // Edit-specific state
  const [removedSocialIds, setRemovedSocialIds] = useState<number[]>([]);
  const [removedLinkIds, setRemovedLinkIds] = useState<number[]>([]);
  const [syncingSourceIds, setSyncingSourceIds] = useState<number[]>([]);

  // Connected sources store
  const {
    getDisplaySources,
    markSourceForRemoval,
    unmarkSourceForRemoval,
    clearRemovedSources,
    removedSourceIds,
  } = useConnectedSourcesStore();

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    mode: "onChange",
    defaultValues: {
      suggestedQuestions: {
        questions: [],
      },
      isPublished: false,
      blogLinks: [],
    },
  });

  const { data: user } = useUser();
  const isPaidUser = user?.subscriptionPlan === GengarSubscriptionPlan.PLUS;

  // Clear store on unmount
  useEffect(() => {
    return () => {
      clearRemovedSources();
    };
  }, [clearRemovedSources]);

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/");
    }
  }, [sessionStatus, router]);

  // Redirect on API error
  useEffect(() => {
    if (appError && sessionStatus === "authenticated") {
      console.error("Failed to load app:", appError);
      router.push("/");
    }
  }, [appError, sessionStatus, router]);

  // Initialize form when app data is loaded
  useEffect(() => {
    if (currentApp && !formInitialized) {
      // Set form values
      form.reset({
        name: currentApp.name,
        displayName: currentApp.displayName,
        description: currentApp.description,
        instruction: currentApp.instruction,
        isPublished: currentApp.isPublished || false,
        suggestedQuestions: currentApp.suggestedQuestionsConfig
          ? {
              questions: currentApp.suggestedQuestionsConfig.questions || [],
            }
          : {
              questions: [],
            },
        blogLinks: [],
      });

      // Set logo preview if exists
      if (currentApp.logo) {
        setPreviewUrl(currentApp.logo);
      }

      // Set existing blog links
      if (currentApp.appLinks) {
        const links = currentApp.appLinks.map((link) => link.link);
        setBlogLinks(links);
      }

      // Mark existing social sources as connected
      if (currentApp.socialSources) {
        currentApp.socialSources.forEach((source) => {
          switch (source.type) {
            case SocialNetworkType.FACEBOOK:
              setFacebookConnected(true);
              break;
            case SocialNetworkType.INSTAGRAM:
              setInstagramConnected(true);
              break;
            case SocialNetworkType.THREADS:
              setThreadsConnected(true);
              break;
            case SocialNetworkType.LINKEDIN:
              setLinkedinConnected(true);
              break;
            case SocialNetworkType.GMAIL:
              setGmailConnected(true);
              break;
            case SocialNetworkType.REDDIT:
              setRedditConnected(true);
              break;
            case SocialNetworkType.MEDIUM:
              setMediumConnected(true);
              break;
            case SocialNetworkType.SUBSTACK:
              setSubstackConnected(true);
              break;
            case SocialNetworkType.GITHUB:
              setGithubConnected(true);
              break;
            case SocialNetworkType.GOODREADS:
              setGoodreadsConnected(true);
              break;
            case SocialNetworkType.PRODUCTHUNT:
              setProductHuntConnected(true);
              break;
            case SocialNetworkType.TWITTER:
              setTwitterConnected(true);
              break;
          }
        });
      }

      setFormInitialized(true);
    }
  }, [currentApp, formInitialized, form]);

  // Listen for OAuth messages
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        console.log("Received message:", event.data);

        if (event.data.type === "oauth-result") {
          const { success, code, error, network } = event.data;

          if (success && code && currentOAuthPlatform) {
            const newCredentials = [...socialCredentials];

            // Update connection state
            switch (currentOAuthPlatform) {
              case SocialNetworkType.FACEBOOK:
                setFacebookConnected(true);
                break;
              case SocialNetworkType.THREADS:
                setThreadsConnected(true);
                break;
              case SocialNetworkType.LINKEDIN:
                setLinkedinConnected(true);
                break;
              case SocialNetworkType.GMAIL:
                setGmailConnected(true);
                break;
              case SocialNetworkType.INSTAGRAM:
                setInstagramConnected(true);
                break;
              case SocialNetworkType.REDDIT:
                setRedditConnected(true);
                break;
              case SocialNetworkType.MEDIUM:
                setMediumConnected(true);
                break;
              case SocialNetworkType.GITHUB:
                setGithubConnected(true);
                break;
              case SocialNetworkType.PRODUCTHUNT:
                setProductHuntConnected(true);
                break;
            }

            // Add credentials
            newCredentials.push({
              code,
              source: currentOAuthPlatform,
            });
            setSocialCredentials(newCredentials);
            setCurrentOAuthPlatform(null);

            const platformName =
              currentOAuthPlatform.charAt(0).toUpperCase() +
              currentOAuthPlatform.slice(1);

            toast({
              title: `${platformName} Connected`,
              description: `Successfully connected with ${platformName}.`,
            });
          } else if (error) {
            toast({
              title: "Connection Failed",
              description:
                error || "Failed to connect with social media account.",
              variant: "destructive",
            });
            setCurrentOAuthPlatform(null);
          }
        }
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [socialCredentials, currentOAuthPlatform]);

  // Social connection handlers
  const connectWithPlatform = (
    platform:
      | "facebook"
      | "instagram"
      | "threads"
      | "linkedin"
      | "reddit"
      | "github"
      | "producthunt"
  ) => {
    const networkType = {
      facebook: SocialNetworkType.FACEBOOK,
      instagram: SocialNetworkType.INSTAGRAM,
      threads: SocialNetworkType.THREADS,
      linkedin: SocialNetworkType.LINKEDIN,
      reddit: SocialNetworkType.REDDIT,
      github: SocialNetworkType.GITHUB,
      producthunt: SocialNetworkType.PRODUCTHUNT,
    }[platform];

    setCurrentOAuthPlatform(networkType);

    let authUrl = "";
    switch (platform) {
      case "facebook":
        authUrl = buildFacebookUrl();
        break;
      case "instagram":
        authUrl = buildInstagramUrl();
        break;
      case "threads":
        authUrl = buildThreadsUrl();
        break;
      case "reddit":
        const redirectUri = absoluteUrl("/apps/connect");
        authUrl = buildRedditUrl(redirectUri);
        break;
      case "github":
        authUrl = buildGitHubUrl();
        break;
      case "producthunt":
        const prodRedirectUri = absoluteUrl("/apps/connect");
        authUrl = buildProductHuntUrl(prodRedirectUri);
        break;
    }

    if (!authUrl) {
      toast({
        title: "Error",
        description: `Failed to connect with ${platform}.`,
        variant: "destructive",
      });
      return;
    }

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      authUrl,
      `${platform}-oauth`,
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );
  };

  const connectWithGmail = () => {
    setCurrentOAuthPlatform(SocialNetworkType.GMAIL);

    const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
    const redirectUri = absoluteUrl("/apps/connect");
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
    );
    const responseType = "code";
    const accessType = "offline";
    const prompt = "consent";

    const state = Math.random().toString(36).substring(7);
    localStorage.setItem("gmail_oauth_state", state);

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${scope}&` +
      `access_type=${accessType}&` +
      `prompt=${prompt}&` +
      `state=${state}`;

    if (!clientId) {
      toast({
        title: "Error",
        description: "Gmail client ID not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      authUrl,
      "gmail-oauth",
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );
  };

  const connectWithMedium = async (username: string) => {
    try {
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username: username,
        source: SocialNetworkType.MEDIUM,
      });
      setSocialCredentials(newCredentials);
      setMediumConnected(true);

      toast({
        title: "Medium Connected",
        description: "Successfully connected with Medium.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Medium. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const connectWithSubstack = async (username: string) => {
    try {
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username: username,
        source: SocialNetworkType.SUBSTACK,
      });
      setSocialCredentials(newCredentials);
      setSubstackConnected(true);

      toast({
        title: "Substack Connected",
        description: "Successfully connected with Substack.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Substack. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const connectWithLinkedInUsername = async (username: string) => {
    try {
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username,
        source: SocialNetworkType.LINKEDIN,
      });
      setSocialCredentials(newCredentials);
      setLinkedinConnected(true);
      toast({
        title: "Successfully connected with LinkedIn",
        description: "Your LinkedIn profile has been connected.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error connecting with LinkedIn",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const connectWithTwitterUsername = async (username: string) => {
    try {
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username,
        source: SocialNetworkType.TWITTER,
      });
      setSocialCredentials(newCredentials);
      setTwitterConnected(true);
      toast({
        title: "Successfully connected with Twitter",
        description: "Your Twitter profile has been connected.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error connecting with Twitter",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const connectWithGoodreads = async (rssUrl: string) => {
    try {
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username: rssUrl,
        source: SocialNetworkType.GOODREADS,
      });
      setSocialCredentials(newCredentials);
      setGoodreadsConnected(true);
      toast({
        title: "Successfully connected with Goodreads",
        description: "Your Goodreads RSS feed has been connected.",
      });
    } catch (error) {
      console.error("Error connecting with Goodreads:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect with Goodreads. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle sync data source
  const handleSyncDataSource = async (
    sourceId: number,
    sourceType: SocialNetworkType
  ) => {
    try {
      setSyncingSourceIds((prev) => [...prev, sourceId]);

      const sourceName = sourceType.toLowerCase();
      await gengarApi.syncDataSource(uniqueId, sourceName);

      toast({
        title: "Sync initiated",
        description:
          "Data is being synced in the background. Your AI knowledge will be updated in a few minutes.",
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description:
          error instanceof Error ? error.message : "Failed to sync data source",
        variant: "destructive",
      });
    } finally {
      setSyncingSourceIds((prev) => prev.filter((id) => id !== sourceId));
    }
  };

  // Transform blog links for submission
  const transformBlogLinksForSubmission = () => {
    const existingLinks = currentApp?.appLinks || [];
    const existingUrls = existingLinks.map((link) => link.link);

    // Find removed links - links that existed before but are not in current blogLinks
    const removedIds = existingLinks
      .filter((link) => !blogLinks.includes(link.link))
      .map((link) => link.id);

    // Find new links - links in blogLinks that weren't in existingUrls
    const newLinks = blogLinks.filter((link) => !existingUrls.includes(link));

    return { newLinks, removedIds };
  };

  // Transform social sources for submission
  const transformSocialSourcesForSubmission = () => {
    if (!currentApp?.socialSources)
      return { removedSocialIds: [], socialCredentials };

    const existingSources = currentApp.socialSources.map((s) => ({
      id: s.id,
      type: s.type,
    }));

    // Find removed sources
    const currentConnectionStates = {
      [SocialNetworkType.FACEBOOK]: facebookConnected,
      [SocialNetworkType.INSTAGRAM]: instagramConnected,
      [SocialNetworkType.THREADS]: threadsConnected,
      [SocialNetworkType.LINKEDIN]: linkedinConnected,
      [SocialNetworkType.GMAIL]: gmailConnected,
      [SocialNetworkType.REDDIT]: redditConnected,
      [SocialNetworkType.MEDIUM]: mediumConnected,
      [SocialNetworkType.SUBSTACK]: substackConnected,
      [SocialNetworkType.GITHUB]: githubConnected,
      [SocialNetworkType.GOODREADS]: goodreadsConnected,
      [SocialNetworkType.PRODUCTHUNT]: productHuntConnected,
      [SocialNetworkType.TWITTER]: twitterConnected,
    };

    const removedIds = existingSources
      .filter((source) => !currentConnectionStates[source.type])
      .map((source) => source.id);

    return { removedSocialIds: removedIds, socialCredentials };
  };

  async function onSubmit(data: AgentFormValues) {
    // Validate suggested questions
    if (data.suggestedQuestions?.questions) {
      const invalidQuestions = data.suggestedQuestions.questions.filter(
        (q) => q.length === 0 || q.length > SUGGESTED_QUESTION_MAX_LENGTH
      );

      if (invalidQuestions.length > 0) {
        toast({
          title: "Invalid Questions",
          description: `Please ensure all questions are between 1 and ${SUGGESTED_QUESTION_MAX_LENGTH} characters`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsUpdating(true);

    try {
      let logoUrl;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (user) {
          const { s3Key } = await uploadFile(user.userId, formData);
          logoUrl = s3Key;
        }
      }

      const { newLinks, removedIds } = transformBlogLinksForSubmission();
      const {
        removedSocialIds: removedSocialCredentialIds,
        socialCredentials: newCredentials,
      } = transformSocialSourcesForSubmission();

      const updateData: UpdateAppBody = {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        logo: logoUrl || undefined,
        instruction: data.instruction,
        capabilities: [
          ...(data.capabilities.webSearch ? ["webSearch"] : []),
          ...(data.capabilities.imageGeneration ? ["imageGeneration"] : []),
        ],
        removeSocialCredentialIds: removedSocialCredentialIds,
        removeAppLinkIds: removedIds,
        links: newLinks.length > 0 ? newLinks : undefined,
        socialCredentials:
          newCredentials.length > 0 ? newCredentials : undefined,
        isPublished: data.isPublished || false,
        suggestedQuestionsConfig: data.suggestedQuestions
          ? {
              questions: data.suggestedQuestions.questions,
            }
          : undefined,
      };

      const updatedApp = await gengarApi.updateApp(uniqueId, updateData);

      // Invalidate React Query caches
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["official-apps"] });
      await queryClient.invalidateQueries({
        queryKey: ["suggested-questions", updatedApp.uniqueId],
      });

      // Show success toast
      if (currentApp?.isMe) {
        const hasAsyncUpdates =
          newLinks.length > 0 ||
          newCredentials.length > 0 ||
          removedSocialCredentialIds.length > 0 ||
          removedIds.length > 0;

        if (hasAsyncUpdates) {
          toast({
            title: "Digital Clone Updated! ✨",
            description:
              "Your digital clone has been updated. Data sources are being synced in the background.",
            variant: "default",
          });
        } else {
          toast({
            title: "Digital Clone Updated! ✅",
            description:
              "Your digital clone settings have been successfully updated.",
            variant: "default",
          });
        }
      }

      router.push(`/apps/${updatedApp.uniqueId}`);
    } catch (error: any) {
      if (error) {
        toast({
          title: "Error",
          description: error?.response?.data?.error || "Failed to update app",
          variant: "destructive",
        });
      }
      setIsUpdating(false);
    }
  }

  if (isLoading || !currentApp) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const existingSources = currentApp?.socialSources || [];
  const displaySources = getDisplaySources(existingSources);

  return (
    <>
      <div className="w-full max-w-7xl mx-auto pb-40 lg:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form Section */}
          <div className="hidden lg:block">
            <div className="mb-6">
              <h1 className="text-3xl font-bold font-montserrat">
                Edit Your Digital Clone
              </h1>
              <p className="text-base text-muted-foreground mt-1">
                Update your AI representation and data sources
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Basic Information */}
                <BasicInformationSection
                  form={form}
                  open={basicInfoOpen}
                  onOpenChange={setBasicInfoOpen}
                  previewUrl={previewUrl}
                  onFileChange={(file) => {
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPreviewUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                      setFile(file);
                    } else {
                      setPreviewUrl(null);
                      setFile(undefined);
                    }
                  }}
                />

                {/* AI Configuration */}
                <AiConfigurationSection
                  form={form}
                  open={aiConfigOpen}
                  onOpenChange={setAiConfigOpen}
                />

                {/* Suggested Questions */}
                <SuggestedQuestionsSection
                  form={form}
                  open={questionsOpen}
                  onOpenChange={setQuestionsOpen}
                />

                {/* Knowledge Sources - Enhanced for Edit */}
                <KnowledgeSourcesSection
                  form={form}
                  open={knowledgeOpen}
                  onOpenChange={setKnowledgeOpen}
                  socialConnections={{
                    linkedin: linkedinConnected,
                    reddit: redditConnected,
                    medium: mediumConnected,
                    substack: substackConnected,
                    github: githubConnected,
                    goodreads: goodreadsConnected,
                    productHunt: productHuntConnected,
                    facebook: facebookConnected,
                    twitter: twitterConnected,
                  }}
                  onSocialConnect={{
                    linkedin: () => setLinkedinDialogOpen(true),
                    reddit: () => connectWithPlatform("reddit"),
                    medium: () => setMediumDialogOpen(true),
                    substack: () => setSubstackDialogOpen(true),
                    github: () => connectWithPlatform("github"),
                    goodreads: () => setGoodreadsDialogOpen(true),
                    productHunt: () => connectWithPlatform("producthunt"),
                    facebook: () => connectWithPlatform("facebook"),
                    twitter: () => setTwitterDialogOpen(true),
                  }}
                  blogLinks={blogLinks}
                  setBlogLinks={setBlogLinks}
                >
                  {/* Display connected sources */}
                  <ConnectedSourcesList
                    sources={displaySources}
                    syncingSourceIds={syncingSourceIds}
                    onSync={(id, type) => {
                      // Check if user is free plan
                      if (!isPaidUser) {
                        setShowUpgradeDialog(true);
                        return;
                      }

                      if (typeof id === "number") {
                        handleSyncDataSource(id, type);
                      }
                    }}
                    onRemove={(source) => {
                      // Mark source as disconnected
                      switch (source.type) {
                        case SocialNetworkType.FACEBOOK:
                          setFacebookConnected(false);
                          break;
                        case SocialNetworkType.INSTAGRAM:
                          setInstagramConnected(false);
                          break;
                        case SocialNetworkType.THREADS:
                          setThreadsConnected(false);
                          break;
                        case SocialNetworkType.LINKEDIN:
                          setLinkedinConnected(false);
                          break;
                        case SocialNetworkType.GMAIL:
                          setGmailConnected(false);
                          break;
                        case SocialNetworkType.REDDIT:
                          setRedditConnected(false);
                          break;
                        case SocialNetworkType.MEDIUM:
                          setMediumConnected(false);
                          break;
                        case SocialNetworkType.SUBSTACK:
                          setSubstackConnected(false);
                          break;
                        case SocialNetworkType.GITHUB:
                          setGithubConnected(false);
                          break;
                        case SocialNetworkType.GOODREADS:
                          setGoodreadsConnected(false);
                          break;
                        case SocialNetworkType.PRODUCTHUNT:
                          setProductHuntConnected(false);
                          break;
                        case SocialNetworkType.TWITTER:
                          setTwitterConnected(false);
                          break;
                      }

                      // Mark for removal if it's an existing source
                      if (typeof source.id === "number") {
                        markSourceForRemoval(source.id);
                        setRemovedSocialIds((prev) => [
                          ...prev,
                          source.id as number,
                        ]);
                      }

                      toast({
                        title: "Source Removed",
                        description: `${source.type} has been disconnected. Save to apply changes.`,
                      });
                    }}
                    isEditMode={true}
                  />
                </KnowledgeSourcesSection>

                {/* Publishing Settings */}
                <PublishingSettingsSection
                  form={form}
                  open={publishingOpen}
                  onOpenChange={setPublishingOpen}
                />
              </form>
            </Form>
          </div>

          {/* Right Column - Buttons and Preview */}
          <div>
            <div className="md:sticky md:top-0">
              {/* Preview */}
              <AppPreview
                displayName={form.watch("displayName")}
                name={form.watch("name")}
                description={form.watch("description")}
                logoUrl={previewUrl || undefined}
                suggestedQuestions={form.watch("suggestedQuestions.questions")}
                isPublished={form.watch("isPublished")}
              />
              {/* Buttons - Desktop only */}
              <div className="hidden lg:flex items-center gap-4 justify-center mt-6">
                <Button
                  variant="link"
                  type="button"
                  onClick={() => router.back()}
                  size="lg"
                  className="text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  size="lg"
                  disabled={isUpdating}
                  className="text-base"
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <SquareCheckBig className="mr-2 size-4" />
                  )}
                  {isUpdating ? "Updating..." : "Update Digital Clone"}
                </Button>
              </div>

              {/* Mobile Update Button */}
              <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
                {form.formState.isValid ? (
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    size="lg"
                    disabled={isUpdating}
                    className="w-full opacity-90"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <SquareCheckBig className="mr-2 size-4" />
                        Update
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="bg-muted/80 backdrop-blur-sm rounded-lg p-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Please complete all required fields to update
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        title="Upgrade to Plus to Sync Data"
        description="Data syncing from social media sources is available exclusively for Plus members. Upgrade now to keep your digital clone up-to-date with your latest content."
        features={[
          "Sync data from all connected sources",
          "Automatic data refresh",
          "Unlimited links and social media integrations",
          "Access advanced analytics dashboard",
          "Priority support",
        ]}
      />
      <MediumConnectDialog
        open={mediumDialogOpen}
        onOpenChange={setMediumDialogOpen}
        onConnect={connectWithMedium}
      />
      <SubstackConnectDialog
        open={substackDialogOpen}
        onOpenChange={setSubstackDialogOpen}
        onConnect={connectWithSubstack}
      />
      <LinkedInConnectDialog
        open={linkedinDialogOpen}
        onOpenChange={setLinkedinDialogOpen}
        onConnect={connectWithLinkedInUsername}
      />
      <TwitterConnectDialog
        open={twitterDialogOpen}
        onOpenChange={setTwitterDialogOpen}
        onConnect={connectWithTwitterUsername}
      />
      <GoodreadsConnectDialog
        open={goodreadsDialogOpen}
        onOpenChange={setGoodreadsDialogOpen}
        onConnect={connectWithGoodreads}
      />

      {/* Mobile Form Sections Component */}
      <MobileFormSections
        form={form}
        previewUrl={previewUrl}
        onFileChange={(file) => {
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
            setFile(file);
          } else {
            setPreviewUrl(null);
            setFile(undefined);
          }
        }}
        socialConnections={{
          linkedin: linkedinConnected,
          reddit: redditConnected,
          medium: mediumConnected,
          substack: substackConnected,
          github: githubConnected,
          goodreads: goodreadsConnected,
          productHunt: productHuntConnected,
          facebook: facebookConnected,
          twitter: twitterConnected,
        }}
        onSocialConnect={{
          linkedin: () => setLinkedinDialogOpen(true),
          reddit: () => connectWithPlatform("reddit"),
          medium: () => setMediumDialogOpen(true),
          substack: () => setSubstackDialogOpen(true),
          github: () => connectWithPlatform("github"),
          goodreads: () => setGoodreadsDialogOpen(true),
          productHunt: () => connectWithPlatform("producthunt"),
          facebook: () => connectWithPlatform("facebook"),
          twitter: () => setTwitterDialogOpen(true),
        }}
        blogLinks={blogLinks}
        setBlogLinks={setBlogLinks}
        knowledgeSourcesChildren={
          existingSources.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Connected Sources</h4>
              <div className="space-y-2">
                {existingSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={`/icons/${source.type.toLowerCase()}.svg`}
                        alt={source.type}
                        className="w-5 h-5"
                      />
                      <span className="text-sm">
                        {source.type} - @{source.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Check if user is free plan
                          if (!isPaidUser) {
                            setShowUpgradeDialog(true);
                            return;
                          }
                          handleSyncDataSource(source.id, source.type);
                        }}
                        disabled={syncingSourceIds.includes(source.id)}
                      >
                        {syncingSourceIds.includes(source.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Sync
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Mark source as disconnected
                          switch (source.type) {
                            case SocialNetworkType.FACEBOOK:
                              setFacebookConnected(false);
                              break;
                            case SocialNetworkType.INSTAGRAM:
                              setInstagramConnected(false);
                              break;
                            case SocialNetworkType.THREADS:
                              setThreadsConnected(false);
                              break;
                            case SocialNetworkType.LINKEDIN:
                              setLinkedinConnected(false);
                              break;
                            case SocialNetworkType.GMAIL:
                              setGmailConnected(false);
                              break;
                            case SocialNetworkType.REDDIT:
                              setRedditConnected(false);
                              break;
                            case SocialNetworkType.MEDIUM:
                              setMediumConnected(false);
                              break;
                            case SocialNetworkType.SUBSTACK:
                              setSubstackConnected(false);
                              break;
                            case SocialNetworkType.GITHUB:
                              setGithubConnected(false);
                              break;
                            case SocialNetworkType.GOODREADS:
                              setGoodreadsConnected(false);
                              break;
                            case SocialNetworkType.PRODUCTHUNT:
                              setProductHuntConnected(false);
                              break;
                            case SocialNetworkType.TWITTER:
                              setTwitterConnected(false);
                              break;
                          }
                          // Add to removed IDs list
                          setRemovedSocialIds((prev) => [...prev, source.id]);
                          toast({
                            title: "Source Removed",
                            description: `${source.type} has been disconnected. Save to apply changes.`,
                          });
                        }}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
      />
    </>
  );
}
