"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, SquareCheckBig, X, Link as LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  gengarApi,
  GengarSubscriptionPlan,
  SocialNetworkType,
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
import { UpgradeDialog } from "@/components/shared/upgrade-dialog";
import { ConnectedSourcesList } from "@/components/app-creation/connected-sources-list";
import { useConnectedSourcesStore } from "@/store/connected-sources";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

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

  blogLinks: z.array(z.string().url("Please enter a valid URL")).optional(),
  suggestedQuestions: z
    .object({
      questions: z.array(z.string().min(1, "Question cannot be empty")),
    })
    .optional(),
  isPublished: z.boolean().default(false).optional(),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

const defaultValues: Partial<AgentFormValues> = {
  suggestedQuestions: {
    questions: [
      "What does your typical workday look like?",
      "What recent project are you most proud of?",
      "How do you stay up to date with industry trends?",
      "What advice would you give to someone starting out in your field?",
      "What motivates you to keep pushing forward when things get tough?",
      "What's the most challenging problem you've solved recently?",
    ],
  },
  isPublished: true, // Default is published
};

export default function CreateAgentForm() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | undefined>(undefined);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [blogInput, setBlogInput] = useState("");
  const [blogLinks, setBlogLinks] = useState<string[]>([]);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [threadsConnected, setThreadsConnected] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [redditConnected, setRedditConnected] = useState(false);
  const [mediumConnected, setMediumConnected] = useState(false);
  const [substackConnected, setSubstackConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [mediumDialogOpen, setMediumDialogOpen] = useState(false);
  const [substackDialogOpen, setSubstackDialogOpen] = useState(false);
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false);
  const [twitterDialogOpen, setTwitterDialogOpen] = useState(false);
  const [goodreadsDialogOpen, setGoodreadsDialogOpen] = useState(false);
  const [goodreadsConnected, setGoodreadsConnected] = useState(false);
  const [productHuntConnected, setProductHuntConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [socialCredentials, setSocialCredentials] = useState<
    Array<{
      code?: string;
      username?: string;
      source: SocialNetworkType;
    }>
  >([]);
  const [currentOAuthPlatform, setCurrentOAuthPlatform] =
    useState<SocialNetworkType | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Connected sources store
  const {
    temporarySources,
    addTemporarySource,
    removeTemporarySource,
    clearTemporarySources,
  } = useConnectedSourcesStore();

  // Collapsible states
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [aiConfigOpen, setAiConfigOpen] = useState(true);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const [knowledgeOpen, setKnowledgeOpen] = useState(true);
  const [publishingOpen, setPublishingOpen] = useState(true);

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    mode: "onChange",
    defaultValues: {
      ...defaultValues,
      blogLinks: [],
    },
  });
  const { data: user } = useUser();

  // Check if user is a paid subscriber
  const isPaidUser = user?.subscriptionPlan === GengarSubscriptionPlan.PLUS;

  // Helper functions for free plan limitations
  const getTotalConnectedSocial = () => {
    return [
      facebookConnected,
      instagramConnected,
      threadsConnected,
      linkedinConnected,
      gmailConnected,
      redditConnected,
      mediumConnected,
      substackConnected,
      githubConnected,
      goodreadsConnected,
      productHuntConnected,
      twitterConnected,
    ].filter(Boolean).length;
  };

  const canAddSocialConnection = () => {
    if (isPaidUser) return true;
    return getTotalConnectedSocial() === 0;
  };

  const canAddLink = () => {
    if (isPaidUser) return true;
    return blogLinks.length === 0;
  };

  const handleFreePlanRestriction = (type: "social" | "link") => {
    const features =
      type === "social"
        ? [
            "Connect unlimited social media accounts",
            "Import data from multiple platforms",
            "Advanced content analysis across sources",
            "Cross-platform personality insights",
          ]
        : [
            "Add unlimited links and content sources",
            "Import from multiple blogs and websites",
            "Enhanced knowledge base building",
            "Comprehensive content analysis",
          ];

    setShowUpgradeDialog(true);
  };

  // Check if user already has a digital clone (Me Mode app)
  useEffect(() => {
    if (user) {
      if (user.app && user.app.isMe) {
        // Redirect to existing digital clone
        router.push(`/@${user.app.name}`);
        return;
      }
      // Free users can now create digital clones with limitations
      // No need to redirect to pricing page anymore
    }
  }, [user, isPaidUser, router]);

  // Listen for messages from the OAuth popup
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        console.log("Received message:", event.data);

        // Handle new OAuth popup format
        if (event.data.type === "oauth-result") {
          const { success, code, error, network } = event.data;

          if (success && code && currentOAuthPlatform) {
            // Use the tracked platform type
            const newCredentials = [...socialCredentials];

            console.log("OAuth success received:", {
              success,
              code,
              error,
              network,
              currentOAuthPlatform,
            });

            // Update the appropriate connection state
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

            // Add credentials with the correct platform type
            newCredentials.push({
              code,
              source: currentOAuthPlatform,
            });
            setSocialCredentials(newCredentials);

            // Add to connected sources store for UI display
            addTemporarySource({
              id: `temp-${currentOAuthPlatform}-${Date.now()}`,
              type: currentOAuthPlatform,
              username: "connected", // We don't have username from OAuth yet
              createdAt: new Date().toISOString(),
            });

            // Clear the current OAuth platform
            setCurrentOAuthPlatform(null);

            // Get platform name for toast
            const platformName =
              currentOAuthPlatform === SocialNetworkType.LINKEDIN
                ? "LinkedIn"
                : currentOAuthPlatform === SocialNetworkType.THREADS
                ? "Threads"
                : currentOAuthPlatform === SocialNetworkType.INSTAGRAM
                ? "Instagram"
                : currentOAuthPlatform === SocialNetworkType.GMAIL
                ? "Gmail"
                : currentOAuthPlatform === SocialNetworkType.REDDIT
                ? "Reddit"
                : currentOAuthPlatform === SocialNetworkType.MEDIUM
                ? "Medium"
                : currentOAuthPlatform === SocialNetworkType.GITHUB
                ? "GitHub"
                : "Facebook";

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
            // Clear the current OAuth platform on error
            setCurrentOAuthPlatform(null);
          }
        }

        // Handle legacy OAuth format (keep for backward compatibility)
        if (event.data.type === "FACEBOOK_OAUTH_SUCCESS") {
          // Store Facebook credentials
          setFacebookConnected(true);
          const newCredentials = [...socialCredentials];
          newCredentials.push({
            code: event.data.data.code,
            source: SocialNetworkType.FACEBOOK,
          });
          setSocialCredentials(newCredentials);

          // Add to connected sources for UI display
          addTemporarySource({
            id: `temp-facebook-${Date.now()}`,
            type: SocialNetworkType.FACEBOOK,
            username: "connected",
            createdAt: new Date().toISOString(),
          });

          toast({
            title: "Facebook Connected",
            description: "Successfully connected with Facebook.",
          });
        }

        if (event.data.type === "THREADS_OAUTH_SUCCESS") {
          // Store Threads credentials
          setThreadsConnected(true);
          const newCredentials = [...socialCredentials];
          newCredentials.push({
            code: event.data.data.code,
            source: SocialNetworkType.THREADS,
          });
          setSocialCredentials(newCredentials);

          // Add to connected sources for UI display
          addTemporarySource({
            id: `temp-threads-${Date.now()}`,
            type: SocialNetworkType.THREADS,
            username: "connected",
            createdAt: new Date().toISOString(),
          });

          toast({
            title: "Threads Connected",
            description: "Successfully connected with Threads.",
          });
        }

        if (event.data.type === "LINKEDIN_OAUTH_SUCCESS") {
          // Store LinkedIn credentials
          setLinkedinConnected(true);
          const newCredentials = [...socialCredentials];
          newCredentials.push({
            code: event.data.data.code,
            source: SocialNetworkType.LINKEDIN,
          });
          setSocialCredentials(newCredentials);

          // Add to connected sources for UI display
          addTemporarySource({
            id: `temp-linkedin-${Date.now()}`,
            type: SocialNetworkType.LINKEDIN,
            username: "connected",
            createdAt: new Date().toISOString(),
          });

          toast({
            title: "LinkedIn Connected",
            description: "Successfully connected with LinkedIn.",
          });
        }

        if (event.data.type === "GMAIL_OAUTH_SUCCESS") {
          // Store Gmail credentials
          setGmailConnected(true);
          const newCredentials = [...socialCredentials];
          newCredentials.push({
            code: event.data.data.code,
            source: SocialNetworkType.GMAIL,
          });
          setSocialCredentials(newCredentials);

          // Add to connected sources for UI display
          addTemporarySource({
            id: `temp-gmail-${Date.now()}`,
            type: SocialNetworkType.GMAIL,
            username: "connected",
            createdAt: new Date().toISOString(),
          });

          toast({
            title: "Gmail Connected",
            description: "Successfully connected with Gmail.",
          });
        }

        if (event.data.type === "INSTAGRAM_OAUTH_SUCCESS") {
          // Store Instagram credentials
          setInstagramConnected(true);
          const newCredentials = [...socialCredentials];
          newCredentials.push({
            code: event.data.data.code,
            source: SocialNetworkType.INSTAGRAM,
          });
          setSocialCredentials(newCredentials);

          // Add to connected sources for UI display
          addTemporarySource({
            id: `temp-instagram-${Date.now()}`,
            type: SocialNetworkType.INSTAGRAM,
            username: "connected",
            createdAt: new Date().toISOString(),
          });

          toast({
            title: "Instagram Connected",
            description: "Successfully connected with Instagram.",
          });
        }

        if (event.data.type === "REDDIT_OAUTH_SUCCESS") {
          // Store Reddit credentials
          setRedditConnected(true);
          const newCredentials = [...socialCredentials];
          newCredentials.push({
            code: event.data.data.code,
            source: SocialNetworkType.REDDIT,
          });
          setSocialCredentials(newCredentials);

          // Add to connected sources for UI display
          addTemporarySource({
            id: `temp-reddit-${Date.now()}`,
            type: SocialNetworkType.REDDIT,
            username: "connected",
            createdAt: new Date().toISOString(),
          });

          toast({
            title: "Reddit Connected",
            description: "Successfully connected with Reddit.",
          });
        }
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [socialCredentials, currentOAuthPlatform, addTemporarySource]);

  // Connect with social media
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
    const isFacebook = platform === "facebook";
    const isInstagram = platform === "instagram";
    const isLinkedIn = platform === "linkedin";
    const isThreads = platform === "threads";
    const isReddit = platform === "reddit";
    const isGitHub = platform === "github";
    const isProductHunt = platform === "producthunt";
    const platformName = isLinkedIn
      ? "LinkedIn"
      : isFacebook
      ? "Facebook"
      : isInstagram
      ? "Instagram"
      : isThreads
      ? "Threads"
      : isReddit
      ? "Reddit"
      : isGitHub
      ? "GitHub"
      : "Product Hunt";
    // Set the current OAuth platform for tracking
    const networkType = isLinkedIn
      ? SocialNetworkType.LINKEDIN
      : isFacebook
      ? SocialNetworkType.FACEBOOK
      : isInstagram
      ? SocialNetworkType.INSTAGRAM
      : isThreads
      ? SocialNetworkType.THREADS
      : isReddit
      ? SocialNetworkType.REDDIT
      : isGitHub
      ? SocialNetworkType.GITHUB
      : SocialNetworkType.PRODUCTHUNT;
    setCurrentOAuthPlatform(networkType);
    const stateKey = isLinkedIn
      ? "linkedin_oauth_state"
      : isFacebook
      ? "facebook_oauth_state"
      : isInstagram
      ? "instagram_oauth_state"
      : isThreads
      ? "threads_oauth_state"
      : isReddit
      ? "reddit_oauth_state"
      : isGitHub
      ? "github_oauth_state"
      : "producthunt_oauth_state";
    let authUrlFinal: string = "";
    let stateForLocalStorage: string | null = null;

    // Construct a redirect URI. For popup flows, this points to the connect handler
    // All platforms use the same redirect URI that matches the registered OAuth apps
    // ProductHunt requires HTTPS even in development
    const platformPopupRedirectUri =
      process.env.NODE_ENV === "production"
        ? "https://mentionai.io/apps/connect"
        : platform === "producthunt"
        ? "https://localhost:4000/apps/connect"
        : "http://localhost:4000/apps/connect";

    if (isFacebook) {
      authUrlFinal = buildFacebookUrl(); // Assuming buildFacebookUrl handles its own state or doesn't use localStorage via stateKey here
      // If Facebook needs state stored via stateKey for popup: stateForLocalStorage = generateStateForFacebook();
    } else if (isInstagram) {
      authUrlFinal = buildInstagramUrl(); // Instagram handles its own state internally
    } else if (isThreads) {
      authUrlFinal = buildThreadsUrl(); // Assuming buildThreadsUrl handles its own state or doesn't use localStorage via stateKey here
      // If Threads needs state stored via stateKey for popup: stateForLocalStorage = generateStateForThreads();
    } else if (isReddit) {
      authUrlFinal = buildRedditUrl(platformPopupRedirectUri);
      // Reddit state is handled internally by buildRedditUrl function
    } else if (isGitHub) {
      authUrlFinal = buildGitHubUrl();
      // GitHub state is handled internally by buildGitHubUrl function
    } else if (isProductHunt) {
      authUrlFinal = buildProductHuntUrl(platformPopupRedirectUri);
      // ProductHunt state is handled internally by buildProductHuntUrl function
    }

    if (stateForLocalStorage && stateKey) {
      try {
        localStorage.setItem(stateKey, stateForLocalStorage);
      } catch (error) {
        console.error(
          `Failed to set OAuth state in localStorage for ${platformName}:`,
          error
        );
        toast({
          title: "Error",
          description: `Could not initiate ${platformName} connection. Please ensure cookies/localStorage are enabled.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (!authUrlFinal) {
      toast({
        title: "Error",
        description: `Failed to connect with ${platformName}. Please try again later.`,
        variant: "destructive",
      });
      return;
    }

    // Open login in a popup window
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrlFinal, // Use authUrlFinal which is in scope and holds the correct URL
      `${platform}-oauth`,
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (!popup) {
      toast({
        title: "Error",
        description: `Failed to open ${platformName} login window. Please check your popup blocker settings.`,
        variant: "destructive",
      });
      return;
    }

    // Now we know popup is not null
    const popupWindow = popup;

    // Set up an interval to check if the popup was closed manually
    const pollTimer = window.setInterval(() => {
      // Check if popup was closed manually (user canceled)
      if (popupWindow.closed) {
        window.clearInterval(pollTimer);
        console.log(`${platformName} OAuth popup was closed by user`);
      }
    }, 1000);

    // Store the poll timer so we can clear it when receiving the message
    (popupWindow as any).pollTimer = pollTimer;
  };

  const connectWithTwitter = () => {
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }
    setTwitterDialogOpen(true);
  };

  const connectWithFacebook = () => {
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }
    connectWithPlatform("facebook");
  };

  const connectWithReddit = () => {
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }
    connectWithPlatform("reddit");
  };

  const connectWithGitHub = () => {
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }
    connectWithPlatform("github");
  };

  const connectWithProductHunt = () => {
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }
    connectWithPlatform("producthunt");
  };

  const connectWithGmail = () => {
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }
    // Set the current OAuth platform for tracking
    setCurrentOAuthPlatform(SocialNetworkType.GMAIL);

    // Gmail OAuth2 configuration
    const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
    const redirectUri = absoluteUrl("/apps/connect"); // Use absoluteUrl for consistency
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
    );
    const responseType = "code";
    const accessType = "offline";
    const prompt = "consent";

    // Generate a random state for security
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem("gmail_oauth_state", state);

    // Construct the Gmail OAuth URL
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

    // Open login in a popup window
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      "gmail-oauth",
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (!popup) {
      toast({
        title: "Error",
        description:
          "Failed to open Gmail login window. Please check your popup blocker settings.",
        variant: "destructive",
      });
      return;
    }

    // Set up an interval to check the popup URL
    const pollTimer = window.setInterval(() => {
      try {
        let isRedirected = false;

        if (!popup.closed) {
          try {
            // Check if popup has been redirected to the connect page
            if (
              popup.location.href.indexOf("connect") !== -1 &&
              popup.location.href.indexOf("code=") !== -1
            ) {
              isRedirected = true;
            }
          } catch (e) {
            // Cross-origin access error - ignore
          }
        }

        if (isRedirected) {
          window.clearInterval(pollTimer);

          // Extract auth code and state from URL
          const url = new URL(popup.location.href);
          const params = new URLSearchParams(url.search);
          const code = params.get("code");
          const state = params.get("state");
          const storedState = localStorage.getItem("gmail_oauth_state");

          // Log the auth result
          console.log("Gmail auth result:", {
            code,
            state,
            storedState,
            isStateValid: state === storedState,
            fullUrl: popup.location.href,
          });

          // Close the popup
          popup.close();

          if (code) {
            // Store Gmail credentials
            setGmailConnected(true);
            const newCredentials = [...socialCredentials];
            newCredentials.push({
              code,
              source: SocialNetworkType.GMAIL,
            });
            setSocialCredentials(newCredentials);

            // Add to connected sources for UI display
            addTemporarySource({
              id: `temp-gmail-${Date.now()}`,
              type: SocialNetworkType.GMAIL,
              username: "connected",
              createdAt: new Date().toISOString(),
            });

            toast({
              title: "Gmail Connected",
              description: "Successfully connected with Gmail.",
            });
          }
        }

        // Check if popup was closed
        if (popup.closed) {
          window.clearInterval(pollTimer);
        }
      } catch (e) {
        // Error likely means we don't have access to popup location due to cross-origin restrictions
        // This is normal until the redirect happens
      }
    }, 500);
  };

  const connectWithMedium = async (username: string) => {
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }

    try {
      // Add Medium credentials to the list
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username: username,
        source: SocialNetworkType.MEDIUM,
      });
      setSocialCredentials(newCredentials);
      setMediumConnected(true);

      // Add to connected sources for UI display
      addTemporarySource({
        id: `temp-medium-${Date.now()}`,
        type: SocialNetworkType.MEDIUM,
        username: username,
        createdAt: new Date().toISOString(),
      });

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
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }

    try {
      // Add Substack credentials to the list
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username: username,
        source: SocialNetworkType.SUBSTACK,
      });
      setSocialCredentials(newCredentials);
      setSubstackConnected(true);

      // Add to connected sources for UI display
      addTemporarySource({
        id: `temp-substack-${Date.now()}`,
        type: SocialNetworkType.SUBSTACK,
        username: username,
        createdAt: new Date().toISOString(),
      });

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
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }

    try {
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username,
        source: SocialNetworkType.LINKEDIN,
      });
      setSocialCredentials(newCredentials);
      setLinkedinConnected(true);

      // Add to connected sources for UI display
      addTemporarySource({
        id: `temp-linkedin-${Date.now()}`,
        type: SocialNetworkType.LINKEDIN,
        username: username,
        createdAt: new Date().toISOString(),
      });
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
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }

    try {
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username,
        source: SocialNetworkType.TWITTER,
      });
      setSocialCredentials(newCredentials);
      setTwitterConnected(true);

      // Add to connected sources for UI display
      addTemporarySource({
        id: `temp-twitter-${Date.now()}`,
        type: SocialNetworkType.TWITTER,
        username: username,
        createdAt: new Date().toISOString(),
      });
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
    if (!canAddSocialConnection()) {
      handleFreePlanRestriction("social");
      return;
    }

    try {
      const newCredentials = [...socialCredentials];
      newCredentials.push({
        username: rssUrl,
        source: SocialNetworkType.GOODREADS,
      });
      setSocialCredentials(newCredentials);
      setGoodreadsConnected(true);

      // Add to connected sources for UI display
      const goodreadsUsername = rssUrl.includes("goodreads.com/review/list/")
        ? rssUrl.split("/")[5]
        : "connected";
      addTemporarySource({
        id: `temp-goodreads-${Date.now()}`,
        type: SocialNetworkType.GOODREADS,
        username: goodreadsUsername,
        createdAt: new Date().toISOString(),
      });
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

  async function onSubmit(data: AgentFormValues) {
    // Validate suggested questions before submission
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

    setIsCreating(true);

    try {
      let logoUrl = "";
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (user) {
          const { s3Key } = await uploadFile(user.userId, formData);
          logoUrl = s3Key;
        }
      }

      const createAppPayload = {
        name: data.name,
        displayName: data.displayName,
        description: data.description || "",
        logo: logoUrl,
        category: "Other",
        instruction: data.instruction,
        uniqueId: data.name.toLowerCase().replace(/\s+/g, "-"),
        // Include blog links
        links: data.blogLinks || [],
        // Include social credentials if available
        socialCredentials:
          socialCredentials.length > 0 ? socialCredentials : undefined,
        // Include suggested questions config
        suggestedQuestionsConfig: data.suggestedQuestions
          ? {
              questions: data.suggestedQuestions.questions,
            }
          : undefined,
        isMe: true, // Always Me Mode
        isPublished: data.isPublished || false,
      };

      // Debug the payload being sent
      console.log("🚀 API payload being sent:", createAppPayload);

      const app = await gengarApi.createApp(createAppPayload);
      setIsCreating(false);

      // Clear temporary sources after successful creation
      clearTemporarySources();

      // Clear onboarding skip flag since user has now created their clone
      localStorage.removeItem("onboarding_skipped");

      // Invalidate React Query caches to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["official-apps"] });

      // Show success toast for digital clone creation
      toast({
        title: "Digital Clone Created! 🚀",
        description:
          "Your digital clone is being set up. Data from your connected social networks and links is being synced in the background. Your AI knowledge will be updated in a few minutes.",
        variant: "default",
      });

      router.push(`/apps/${app.uniqueId}`);
    } catch (error: any) {
      if (error) {
        toast({
          title: "Error",
          description: error?.response?.data?.error,
          variant: "destructive",
        });
      }
      setIsCreating(false);
    }
  }

  return (
    <>
      <div className="w-full max-w-7xl mx-auto pb-40 lg:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form Section */}
          <div className="hidden lg:block">
            <div className="mb-6">
              <h1 className="text-3xl font-bold font-montserrat">
                Create Your Digital Twin - Free!
              </h1>
              <p className="text-base text-muted-foreground mt-1">
                Start with one social connection and one link for free. Upgrade
                anytime for unlimited sources.
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

                {/* Knowledge Sources */}
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
                    reddit: connectWithReddit,
                    medium: () => setMediumDialogOpen(true),
                    substack: () => setSubstackDialogOpen(true),
                    github: connectWithGitHub,
                    goodreads: () => setGoodreadsDialogOpen(true),
                    productHunt: connectWithProductHunt,
                    facebook: connectWithFacebook,
                    twitter: () => setTwitterDialogOpen(true),
                  }}
                  blogLinks={blogLinks}
                  setBlogLinks={setBlogLinks}
                >
                  {/* Display connected sources */}
                  <ConnectedSourcesList
                    sources={temporarySources}
                    onRemove={(source) => {
                      // Remove from temporary sources
                      removeTemporarySource(source.id);

                      // Update connection state
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

                      // Remove from social credentials
                      setSocialCredentials((prev) =>
                        prev.filter((cred) => {
                          // Match by type and approximate timing
                          if (cred.source !== source.type) return true;
                          return false; // Remove all credentials of this type
                        })
                      );

                      toast({
                        title: "Source Removed",
                        description: `${source.type} has been disconnected.`,
                      });
                    }}
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
                  disabled={isCreating}
                  className="text-base"
                >
                  {isCreating ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <SquareCheckBig className="mr-2 size-4" />
                  )}
                  {isCreating ? "Creating..." : "Publish"}
                </Button>
              </div>

              {/* Mobile Publish Button - Only show when form is valid */}
              <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
                {form.formState.isValid ? (
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    size="lg"
                    disabled={isCreating}
                    className="w-full opacity-90"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <SquareCheckBig className="mr-2 size-4" />
                        Publish
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="bg-muted/80 backdrop-blur-sm rounded-lg p-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Please complete all required fields to publish
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required: Username, Display Name, and AI Instructions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
          reddit: connectWithReddit,
          medium: () => setMediumDialogOpen(true),
          substack: () => setSubstackDialogOpen(true),
          github: connectWithGitHub,
          goodreads: () => setGoodreadsDialogOpen(true),
          productHunt: connectWithProductHunt,
          facebook: connectWithFacebook,
          twitter: () => setTwitterDialogOpen(true),
        }}
        blogLinks={blogLinks}
        setBlogLinks={setBlogLinks}
      />

      {/* Upgrade Dialog for Free Plan Limitations */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        title="Upgrade to connect more sources"
        description="Free plan allows one social connection and one link. Upgrade to Plus to connect unlimited sources and build a comprehensive digital clone."
        features={[
          "Connect unlimited social media accounts",
          "Add unlimited links and content sources",
          "Advanced analytics and insights",
          "Priority data processing and updates",
        ]}
      />
    </>
  );
}
