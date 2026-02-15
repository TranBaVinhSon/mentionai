"use client";
import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import {
  sendOAuthResult,
  extractOAuthParams,
  isPopupContext,
} from "@/utils/oauth-popup";
import { gengarApi } from "@/services/api";
import {
  buildFacebookUrl,
  buildInstagramUrl,
  buildThreadsUrl,
  buildRedditUrl,
  buildGmailUrl,
  buildGitHubUrl,
  buildProductHuntUrl,
} from "@/lib/utils";

export default function AppConnect() {
  const searchParams = useSearchParams();

  // Function to get OAuth URL using client-side builders as fallback
  const getOAuthUrlFallback = (
    network: string,
    redirectUri: string
  ): string => {
    switch (network.toLowerCase()) {
      case "facebook":
        // For Meta platforms, we need to ensure the redirect URI matches what the client-side builder expects
        // The buildFacebookUrl() uses getMetaOAuthRedirectUri() internally, so we'll override it temporarily
        return buildFacebookUrlWithCustomRedirect(redirectUri);
      case "instagram":
        return buildInstagramUrlWithCustomRedirect(redirectUri);
      case "threads":
        return buildThreadsUrlWithCustomRedirect(redirectUri);
      case "linkedin":
        throw new Error(
          "LinkedIn OAuth integration has been removed. Please use username-only integration."
        );
      case "reddit":
        return buildRedditUrl(redirectUri);
      case "gmail":
        return buildGmailUrl(redirectUri);
      case "github":
        return buildGitHubUrl();
      case "producthunt":
        return buildProductHuntUrl(redirectUri);
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  };

  // Helper functions to build OAuth URLs with custom redirect URIs
  const buildFacebookUrlWithCustomRedirect = (redirectUri: string): string => {
    const clientId = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID;
    if (!clientId) {
      console.error(
        "Facebook client ID is not defined in environment variables"
      );
      return "";
    }

    const scope = "email,public_profile,user_posts,user_photos,user_videos";
    const state = Math.random().toString(36).substring(2, 15);

    if (typeof window !== "undefined") {
      localStorage.setItem("facebook_oauth_state", state);
    }

    const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("state", state);
    url.searchParams.append("scope", scope);
    url.searchParams.append("response_type", "code");

    return url.toString();
  };

  const buildInstagramUrlWithCustomRedirect = (redirectUri: string): string => {
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
    if (!clientId) {
      console.error(
        "Instagram client ID is not defined in environment variables"
      );
      return "";
    }

    const scope =
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments";
    const state = Math.random().toString(36).substring(2, 15);

    if (typeof window !== "undefined") {
      localStorage.setItem("instagram_oauth_state", state);
    }

    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("state", state);
    url.searchParams.append("scope", scope);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("enable_fb_login", "0");
    url.searchParams.append("force_authentication", "1");

    return url.toString();
  };

  const buildThreadsUrlWithCustomRedirect = (redirectUri: string): string => {
    const clientId = process.env.NEXT_PUBLIC_THREADS_CLIENT_ID;
    if (!clientId) {
      console.error(
        "Threads client ID is not defined in environment variables"
      );
      return "";
    }

    const scope = "threads_basic";
    const state = Math.random().toString(36).substring(2, 15);

    if (typeof window !== "undefined") {
      localStorage.setItem("threads_oauth_state", state);
    }

    const url = new URL("https://www.threads.net/oauth/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("state", state);
    url.searchParams.append("scope", scope);
    url.searchParams.append("response_type", "code");

    return url.toString();
  };

  // Function to redirect to OAuth provider
  const redirectToOAuthProvider = async (network: string, isPopup: boolean) => {
    try {
      // Use a clean redirect URI without query parameters to match what the backend expects
      // ProductHunt requires HTTPS, so use HTTPS for ProductHunt even in development
      const baseUri =
        network === "producthunt"
          ? window.location.origin.replace("http://", "https://")
          : window.location.origin;
      const redirectUri = `${baseUri}/apps/connect`;

      let oauthUrl: string;

      try {
        // Try to get OAuth URL from backend first
        const { url } = await gengarApi.getOAuthUrl(network, redirectUri);
        oauthUrl = url;
        console.log("Using backend OAuth URL for", network);
      } catch (backendError) {
        console.warn(
          "Backend OAuth endpoint failed, using client-side fallback:",
          backendError
        );
        // Fallback to client-side OAuth URL builders (working approach from digital clone creation)
        try {
          oauthUrl = getOAuthUrlFallback(network, redirectUri);
          console.log("Using client-side OAuth URL fallback for", network);
        } catch (fallbackError) {
          console.error("Client-side fallback also failed:", fallbackError);
          throw new Error(
            `Failed to generate OAuth URL for ${network}: ${
              fallbackError instanceof Error
                ? fallbackError.message
                : "Unknown error"
            }`
          );
        }
      }

      // Redirect to OAuth provider
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("Error redirecting to OAuth provider:", error);

      if (isPopup) {
        sendOAuthResult({
          success: false,
          error: `Failed to initiate ${network} authentication: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      } else {
        toast({
          title: "Authentication Error",
          description: `Failed to initiate ${network} authentication. Please try again.`,
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    // Get OAuth parameters from URL
    const { code, error, error_description } = extractOAuthParams();

    // Get additional parameters
    const network = searchParams?.get("network");
    const appId = searchParams?.get("appId");
    const isPopup = searchParams?.get("popup") === "true" || isPopupContext();

    // If no code and no error, redirect to OAuth provider
    if (!code && !error && network) {
      redirectToOAuthProvider(network, isPopup);
      return;
    }

    // Determine platform from network parameter or legacy platform parameter
    let platform = network || searchParams?.get("platform");
    if (!platform) {
      const state = searchParams?.get("state");
      if (state) {
        // Check if platform can be identified from state parameter
        if (state.startsWith("reddit_")) {
          platform = "reddit";
        } else if (state.startsWith("linkedin_")) {
          platform = "linkedin";
        } else if (state.startsWith("facebook_")) {
          platform = "facebook";
        } else if (state.startsWith("instagram_")) {
          platform = "instagram";
        } else if (state.startsWith("threads_")) {
          platform = "threads";
        } else if (state.startsWith("gmail_")) {
          platform = "gmail";
        } else if (state.startsWith("github_")) {
          platform = "github";
        } else if (state.startsWith("producthunt_")) {
          platform = "producthunt";
        }
      }
    }
    // platform = platform || "facebook"; // Removed default fallback to prevent incorrect platform display

    // Determine which platform we're connecting with
    const isThreads = platform === "threads";
    const isLinkedIn = platform === "linkedin";
    const isInstagram = platform === "instagram";
    const isGmail = platform === "gmail";
    const isReddit = platform === "reddit";
    const isGitHub = platform === "github";
    const isProductHunt = platform === "producthunt";
    const isFacebook = platform === "facebook";
    const platformName = isLinkedIn
      ? "LinkedIn"
      : isThreads
      ? "Threads"
      : isInstagram
      ? "Instagram"
      : isGmail
      ? "Gmail"
      : isReddit
      ? "Reddit"
      : isGitHub
      ? "GitHub"
      : isProductHunt
      ? "ProductHunt"
      : isFacebook
      ? "Facebook"
      : platform || "Unknown Platform";
    const stateKey = isLinkedIn
      ? "linkedin_oauth_state"
      : isThreads
      ? "threads_oauth_state"
      : isInstagram
      ? "instagram_oauth_state"
      : isGmail
      ? "gmail_oauth_state"
      : isReddit
      ? "reddit_oauth_state"
      : isGitHub
      ? "github_oauth_state"
      : isProductHunt
      ? "producthunt_oauth_state"
      : isFacebook
      ? "facebook_oauth_state"
      : `${platform}_oauth_state`;
    const messageType = isLinkedIn
      ? "LINKEDIN_OAUTH_SUCCESS"
      : isThreads
      ? "THREADS_OAUTH_SUCCESS"
      : isInstagram
      ? "INSTAGRAM_OAUTH_SUCCESS"
      : isGmail
      ? "GMAIL_OAUTH_SUCCESS"
      : isReddit
      ? "REDDIT_OAUTH_SUCCESS"
      : isGitHub
      ? "GITHUB_OAUTH_SUCCESS"
      : isProductHunt
      ? "PRODUCTHUNT_OAUTH_SUCCESS"
      : isFacebook
      ? "FACEBOOK_OAUTH_SUCCESS"
      : `${platform?.toUpperCase()}_OAUTH_SUCCESS`;

    // Get stored state for verification
    const storedState =
      typeof window !== "undefined" ? localStorage.getItem(stateKey) : null;

    // Log the OAuth response
    console.log(`${platformName} OAuth response:`, {
      code,
      error,
      error_description,
      platform,
      appId,
      isPopup,
      timestamp: new Date().toISOString(),
    });

    // Handle OAuth result
    if (code && !error) {
      toast({
        title: `${platformName} connected`,
        description: `Successfully connected with ${platformName}. ${
          isPopup ? "The window will close shortly." : "Redirecting..."
        }`,
      });

      if (isPopup) {
        // Use the new OAuth popup utility for popup context
        setTimeout(() => {
          sendOAuthResult({
            success: true,
            code,
          });
        }, 1000);
      } else {
        // Legacy behavior: send message and close for non-popup context
        if (window.opener && !window.opener.closed) {
          console.log(`Sending ${messageType} message to parent window:`, {
            type: messageType,
            data: { code, platform },
          });

          // Send a message to the opener window
          window.opener.postMessage(
            {
              type: messageType,
              data: { code, platform },
            },
            "*"
          );

          // Close this popup after a short delay
          setTimeout(() => window.close(), 2000);
        } else {
          console.log("No opener window found or window is closed");
          // Redirect to a success page or back to the app
          const redirectUrl = searchParams?.get("redirect");
          if (redirectUrl) {
            window.location.href = decodeURIComponent(redirectUrl);
          }
        }
      }
    } else if (error) {
      const errorMessage =
        error_description || error || "Unknown error occurred";

      toast({
        title: "Connection failed",
        description: `Failed to connect with ${platformName}: ${errorMessage}`,
        variant: "destructive",
      });

      if (isPopup) {
        // Use the new OAuth popup utility for popup context
        setTimeout(() => {
          sendOAuthResult({
            success: false,
            error: errorMessage,
          });
        }, 1000);
      } else {
        // Legacy behavior for non-popup context
        const redirectUrl = searchParams?.get("redirect");
        if (redirectUrl) {
          setTimeout(() => {
            window.location.href = decodeURIComponent(redirectUrl);
          }, 2000);
        }
      }
    }
  }, [searchParams]);

  // Determine platform for UI (reuse the same logic from above)
  const uiPlatform =
    searchParams?.get("network") || searchParams?.get("platform");
  let finalUiPlatform = uiPlatform;
  if (!finalUiPlatform) {
    const state = searchParams?.get("state");
    if (state) {
      if (state.startsWith("reddit_")) {
        finalUiPlatform = "reddit";
      } else if (state.startsWith("linkedin_")) {
        finalUiPlatform = "linkedin";
      } else if (state.startsWith("facebook_")) {
        finalUiPlatform = "facebook";
      } else if (state.startsWith("instagram_")) {
        finalUiPlatform = "instagram";
      } else if (state.startsWith("threads_")) {
        finalUiPlatform = "threads";
      } else if (state.startsWith("gmail_")) {
        finalUiPlatform = "gmail";
      } else if (state.startsWith("github_")) {
        finalUiPlatform = "github";
      } else if (state.startsWith("producthunt_")) {
        finalUiPlatform = "producthunt";
      }
    }
  }
  // finalUiPlatform = finalUiPlatform || "facebook"; // Removed default fallback to prevent incorrect platform display

  const platformName =
    finalUiPlatform === "linkedin"
      ? "LinkedIn"
      : finalUiPlatform === "threads"
      ? "Threads"
      : finalUiPlatform === "instagram"
      ? "Instagram"
      : finalUiPlatform === "gmail"
      ? "Gmail"
      : finalUiPlatform === "reddit"
      ? "Reddit"
      : finalUiPlatform === "github"
      ? "GitHub"
      : finalUiPlatform === "producthunt"
      ? "ProductHunt"
      : finalUiPlatform === "facebook"
      ? "Facebook"
      : finalUiPlatform || "Unknown Platform";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">
          Connecting with {platformName}
        </h1>
        <p className="mb-2">Processing your {platformName} connection...</p>
        <p className="text-sm text-gray-500">
          This window will close automatically.
        </p>
      </div>
    </div>
  );
}
