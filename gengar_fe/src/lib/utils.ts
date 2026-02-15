import { AVAILABLE_MODELS, ModelType } from "@/utils/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Constants for suggested questions
export const SUGGESTED_QUESTION_MAX_LENGTH = 200;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:4000"
      : "https://mentionai.io";
  return `${baseUrl}${path}`;
}

// Special function for Meta platforms OAuth that require HTTPS
export function getMetaOAuthRedirectUri(platform?: string): string {
  // For development, use HTTP localhost:4000 to match the current dev server
  // Note: Meta OAuth typically requires HTTPS, but for local development we'll use HTTP
  // In production, use the proper HTTPS URL
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "https://localhost:4000" // Use HTTP localhost:4000 for local dev server
      : "https://mentionai.io"; // Production URL

  const path = platform
    ? `/apps/connect?platform=${platform}`
    : "/apps/connect";
  return `${baseUrl}${path}`;
}

// TODO: Sync this list with the backend: https://github.com/lugia-labs/gengar/blob/main/src/config/constants.ts#L5
// Remove the old hardcoded IMAGE_MODELS list
// export const IMAGE_MODELS = [
//   "sdxl-lightning-4step",
//   "stable-diffusion-3.5",
//   "dall-e-3",
//   "flux-1.1-pro",
//   "sdxl-emoji",
//   "sdxl-barbie",
//   "studio-ghibli",
//   "animate-diff",
//   "hotshot-xl",
// ];

// Derive TEXT_MODELS from AVAILABLE_MODELS
export const TEXT_MODELS = AVAILABLE_MODELS.filter(
  (model) => model.modelType === ModelType.TEXT
).map((model) => model.name.toLowerCase());

// Derive IMAGE_MODELS from AVAILABLE_MODELS
export const IMAGE_MODELS = AVAILABLE_MODELS.filter(
  (model) => model.modelType === ModelType.IMAGE
).map((model) => model.name.toLowerCase());

// Combine both lists for easier checking (already lowercased)
export const ALL_MODELS = [...TEXT_MODELS, ...IMAGE_MODELS];

// Input: generate image about React.js using @stable-diffusion-3 and using @gpt-4o to write a blog about its latest features
// Output: [stable-diffusion-3, gpt-4o]
export function extractTextModelsFromRequest(request: string): string[] {
  const modelRegex = /@(gemini-\d+(?:\.\d+)?(?:-\w+)?|[\w.-]+)/g;
  const matches = request.matchAll(modelRegex);
  const models = Array.from(matches, (match) => match[1]);
  const textModels = models.filter((model) => TEXT_MODELS.includes(model));
  return textModels;
}

// Extract app IDs from the request
// Input: @steve-jobs and @elon-musk: debate about the future of AI
// Output: ["Hw9g3wQmswCf", "gbZsLR0cJGJv"] (the uniqueIds associated with these display names)
export function extractAppIdsFromRequest(request: string): string[] {
  // If window.appUniqueIds is not available, return empty array
  if (typeof window === "undefined" || !window.appUniqueIds) {
    return [];
  }

  // Get all app display names we know about
  const appNames = Object.keys(window.appUniqueIds);

  // For each app name, check if it's mentioned in the request
  const uniqueIds: string[] = [];
  const seenIds = new Set<string>(); // To avoid duplicates

  for (const appName of appNames) {
    // Look for @appName in the request
    const mentionPattern = new RegExp(`@${appName}\\b`, "i");
    if (mentionPattern.test(request)) {
      const uniqueId = window.appUniqueIds[appName];
      if (!seenIds.has(uniqueId)) {
        uniqueIds.push(uniqueId);
        seenIds.add(uniqueId);
      }
    }
  }

  return uniqueIds;
}

// Check if the request contains app mentions for debate
export function containsAppMentions(request: string): boolean {
  return extractAppIdsFromRequest(request).length > 0;
}

// Build Facebook OAuth URL for login popup
export function buildFacebookUrl(): string {
  // Redirect to the connect page after authentication
  const redirectUri = getMetaOAuthRedirectUri();
  const clientId = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID;

  if (!clientId) {
    console.error("Facebook client ID is not defined in environment variables");
    return "";
  }

  // Request necessary permissions for accessing user content
  // email,public_profile: Basic user info
  // user_posts: Access to user's posts (requires App Review for production)
  // user_photos: Access to user's photos
  // user_videos: Access to user's videos
  const scope = "email,public_profile,user_posts,user_photos,user_videos";
  const state = Math.random().toString(36).substring(2, 15);

  // Store state in localStorage for validation when the user returns
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
}

// Build Instagram OAuth URL for login popup using the new Instagram API
export function buildInstagramUrl(): string {
  // Redirect to the connect page after authentication
  const redirectUri = getMetaOAuthRedirectUri();
  const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;

  if (!clientId) {
    console.error(
      "Instagram client ID is not defined in environment variables"
    );
    return "";
  }

  // Instagram API with Instagram Login scopes (new API, replaces Basic Display)
  // instagram_business_basic: Basic access to Instagram Business account
  // instagram_business_manage_messages: Manage messages (optional)
  // instagram_business_manage_comments: Manage comments (optional)
  const scope =
    "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments";
  const state = Math.random().toString(36).substring(2, 15);

  // Store state in localStorage for validation when the user returns
  if (typeof window !== "undefined") {
    localStorage.setItem("instagram_oauth_state", state);
  }

  // Use Instagram's new OAuth endpoint (not the deprecated Basic Display API)
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("state", state);
  url.searchParams.append("scope", scope);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("enable_fb_login", "0"); // Force Instagram login
  url.searchParams.append("force_authentication", "1"); // Force re-authentication

  return url.toString();
}

export function buildThreadsUrl(): string {
  const redirectUri = getMetaOAuthRedirectUri("threads");
  const clientId = process.env.NEXT_PUBLIC_THREADS_CLIENT_ID;

  if (!clientId) {
    console.error("Threads client ID is not defined in environment variables");
    return "";
  }

  const scope = "threads_basic";
  const state = Math.random().toString(36).substring(2, 15);

  const url = new URL("https://www.threads.net/oauth/authorize");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("state", state);
  url.searchParams.append("scope", scope);
  url.searchParams.append("response_type", "code");

  return url.toString();
}

// Build Reddit OAuth URL for login popup
export function buildRedditUrl(redirectUri?: string): string {
  // Use provided redirect URI or default to connect page with platform parameter
  const finalRedirectUri =
    redirectUri || absoluteUrl("/apps/connect?platform=reddit");
  const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;

  if (!clientId) {
    console.error("Reddit client ID is not defined in environment variables");
    return "";
  }

  // Request necessary permissions for accessing user content
  // identity: Basic user info and username
  // history: Access to user's post and comment history
  // read: Read posts and comments
  // submit: Submit content (for posting on behalf of user if needed)
  const scope = "identity history read submit";
  const state = `reddit_${Math.random().toString(36).substring(2, 15)}`;

  // Store state in localStorage for validation when the user returns
  if (typeof window !== "undefined") {
    localStorage.setItem("reddit_oauth_state", state);
  }

  const url = new URL("https://www.reddit.com/api/v1/authorize");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("state", state);
  url.searchParams.append("redirect_uri", finalRedirectUri);
  url.searchParams.append("duration", "permanent");
  url.searchParams.append("scope", scope);

  return url.toString();
}

// Build Gmail OAuth URL for login popup
export function buildGmailUrl(redirectUri?: string): string {
  const finalRedirectUri =
    redirectUri || absoluteUrl("/apps/connect?platform=gmail");
  const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;

  if (!clientId) {
    console.error("Gmail client ID is not defined in environment variables");
    return "";
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];
  const state = `gmail_${Math.random().toString(36).substring(2, 15)}`;

  // Store state in localStorage for validation when the user returns
  if (typeof window !== "undefined") {
    localStorage.setItem("gmail_oauth_state", state);
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", finalRedirectUri);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("scope", scopes.join(" "));
  url.searchParams.append("access_type", "offline");
  url.searchParams.append("prompt", "consent");
  url.searchParams.append("state", state);

  return url.toString();
}

// Build GitHub OAuth URL for login popup
export function buildGitHubUrl(): string {
  const finalRedirectUri = absoluteUrl("/api/auth/callback/github");
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

  if (!clientId) {
    console.error("GitHub client ID is not defined in environment variables");
    return "";
  }

  // GitHub OAuth scopes
  // user: Read access to user profile data
  // repo: Access to repositories (for reading repository information)
  const scope = "user repo";
  const stateData = {
    random: Math.random().toString(36).substring(2, 15),
    flowType: "apps",
  };
  const state = `github_${Buffer.from(JSON.stringify(stateData)).toString(
    "base64"
  )}`;

  // Store state in localStorage for validation when the user returns
  if (typeof window !== "undefined") {
    localStorage.setItem("github_oauth_state", state);
  }

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", finalRedirectUri);
  url.searchParams.append("state", state);
  url.searchParams.append("scope", scope);

  return url.toString();
}

// Build ProductHunt OAuth URL for login popup
export function buildProductHuntUrl(redirectUri?: string): string {
  const finalRedirectUri = redirectUri || absoluteUrl("/apps/connect");
  const clientId = process.env.NEXT_PUBLIC_PRODUCTHUNT_CLIENT_ID;

  if (!clientId) {
    console.error(
      "ProductHunt client ID is not defined in environment variables"
    );
    return "";
  }

  // ProductHunt OAuth scopes
  // public: Read public profile data
  // private: Read private user data (including upvoted products, discussions)
  const scope = "public private";
  const state = `producthunt_${Math.random().toString(36).substring(2, 15)}`;

  // Store state in localStorage for validation when the user returns
  if (typeof window !== "undefined") {
    localStorage.setItem("producthunt_oauth_state", state);
  }

  const url = new URL("https://api.producthunt.com/v2/oauth/authorize");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", finalRedirectUri);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("scope", scope);
  url.searchParams.append("state", state);

  return url.toString();
}
