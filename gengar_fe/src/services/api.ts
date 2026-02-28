import { auth } from "@/lib/auth";
import { BACKEND_URL, ModelType } from "@/utils/constants";
import { logger } from "@/utils/logger";
import { Message } from "ai";
import axios, { AxiosError, AxiosInstance } from "axios";
import { getSession } from "next-auth/react";

export interface Model {
  id: number;
  name: string;
  displayName: string;
  description: string;
  labels?: string[];
  isProModel: boolean;
  isLoginRequired: boolean;
  modelType: ModelType;
  tier?: number;
  isReasoning?: boolean;
  supportsImageInput?: boolean;
  supportsWebSearch?: boolean;
}

export interface FormField {
  id: string;
  type: "text" | "select" | "number" | "textarea";
  label: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface InputSchema {
  fields: FormField[];
}

export interface OutputField {
  id: string;
  type: "text" | "image" | "audio" | "video";
  label: string;
  description?: string;
}

export interface OutputSchema {
  fields: OutputField[];
}

export interface PublicAppData {
  id: number;
  name: string;
  displayName: string;
  logo: string;
  uniqueId: string;
  description: string | null;
  userId: number | null;
}

export interface App {
  id: number;
  name: string;
  displayName: string;
  uniqueId: string;
  description: string;
  logo: string;
  isOfficial: boolean;
  category: string;
  capabilities: string[];
  inputSchema?: InputSchema;
  outputSchema?: OutputSchema;
  isMe?: boolean;
  appLinks?: {
    id: number;
    link: string;
    createdAt: string;
    metadata?: {
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
      siteName?: string;
    } | null;
  }[];
  socialSources?: SocialSource[];
  about?: string | null;
  knowledgeGraph?: {
    nodes: Array<{ id: string; label: string; type: string; weight: number }>;
    edges: Array<{ source: string; target: string; label: string }>;
  } | null;
  isPublished?: boolean;
  suggestedQuestionsConfig?: {
    questions?: string[];
  } | null;
  createdAt?: string;
}

export interface SocialSource {
  id: number;
  type: SocialNetworkType;
  username: string;
  createdAt: string;
}

export interface CreateAppBody {
  name: string;
  displayName: string;
  description?: string;
  uniqueId?: string;
  logo?: string;
  category?: string;
  instruction: string;
  links?: string[];
  socialCredentials?: {
    username?: string;
    code?: string;
    userId?: string;
    source: SocialNetworkType;
  }[];
  isMe?: boolean;
  suggestedQuestionsConfig?: {
    questions?: string[];
  };
}

export interface UpdateAppBody {
  name?: string;
  displayName?: string;
  description?: string;
  logo?: string;
  instruction?: string;
  capabilities?: string[];
  socialCredentials?: {
    username?: string;
    code?: string;
    userId?: string;
    source: SocialNetworkType;
  }[];
  links?: string[];
  suggestedQuestions?: string[];
  removeSocialCredentialIds?: number[];
  removeAppLinkIds?: number[];
  isPublished?: boolean;
  suggestedQuestionsConfig?: {
    questions?: string[];
  };
}

export enum SocialNetworkType {
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
  THREADS = "threads",
  TWITTER = "twitter",
  LINKEDIN = "linkedin",
  GMAIL = "gmail",
  REDDIT = "reddit",
  MEDIUM = "medium",
  GITHUB = "github",
  GOODREADS = "goodreads",
  PRODUCTHUNT = "producthunt",
  SUBSTACK = "substack",
}

export interface LoginBody {
  email: string;
  name: string;
  avatar?: string;
  sub: string;
  source: string;
}

export enum GengarSubscriptionPlan {
  FREE = "free",
  PLUS = "plus",
  PRO = "pro",
}

export interface MentionItem {
  id: number;
  name: string;
  displayName: string;
  description: string;
  modelType:
    | "multimodal"
    | "text"
    | "image"
    | "video"
    | "app"
    | "digital clone";
  logo?: string;
  isProModel?: boolean;
  isLoginRequired?: boolean;
  uniqueId?: string;
  isReasoning?: boolean;
  supportsImageInput?: boolean;
  supportsWebSearch?: boolean;
}

// Helper function to convert Model or App to MentionItem
export function toMentionItem(item: Model | App): MentionItem {
  // Convert App to MentionItem
  if ("category" in item) {
    return {
      id: item.id,
      name: item.name,
      displayName: item.displayName,
      description: item.description,
      modelType: "app",
      logo: item.logo,
      uniqueId: item.uniqueId,
      isLoginRequired: true,
      isReasoning: false,
      supportsImageInput: false,
      supportsWebSearch: false,
    };
  } else if ("modelType" in item) {
    // Convert Model to MentionItem
    return {
      id: item.id,
      name: item.name,
      displayName: item.displayName,
      description: item.description,
      modelType: item.modelType,
      isProModel: item.isProModel,
      isLoginRequired: item.isLoginRequired,
      isReasoning: item.isReasoning,
      supportsImageInput: item.supportsImageInput,
      supportsWebSearch: item.supportsWebSearch,
    };
  } else {
    console.error("Invalid item passed to toMentionItem:", item);
    throw new Error("Invalid item format for MentionItem conversion");
  }
}

// Placeholder type - ideally move to a shared types file
// Reuse from src/app/shared/c/[id]/page.tsx
interface Conversation {
  id: string;
  messages: Message[]; // Use the ai/react Message type or define your own
  title: string;
  createdAt: string;
  // Add other relevant fields from your conversation data
}

export enum SocialContentType {
  POST = "post",
  COMMENT = "comment",
  MESSAGE = "message",
  EMAIL = "email",
  PROFILE = "profile",
  BOOK = "book",
  REPOSITORY = "repository",
  PRODUCT = "product",
}

export interface SocialContent {
  id: number;
  source: SocialNetworkType;
  content: string;
  type: SocialContentType;
  appId: number;
  externalId: string;
  socialCredentialId: number;
  socialContentCreatedAt: Date | null;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class GengarApi {
  private baseEndpoint = BACKEND_URL;
  private baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  private logger = logger;
  private debug: boolean = true; // Enable this for req/res logs
  private accessToken?: string;
  public client: AxiosInstance;

  constructor(baseUrl?: string, accessToken?: string) {
    if (baseUrl) {
      this.baseEndpoint = baseUrl;
    }
    if (accessToken) {
      this.baseHeaders["Authorization"] = `Bearer ${accessToken}`;
    }

    this.accessToken = accessToken;
    this.client = axios.create({
      baseURL: this.baseEndpoint,
      timeout: 30000, // 30 seconds default timeout for most operations
      headers: this.baseHeaders,
      // withCredentials: true, // Add this line to enable credentials
    });

    this.attachAccessToken(this.client);
  }

  public getBaseUrl() {
    return this.baseEndpoint;
  }

  private attachDebugLogger(client: AxiosInstance) {
    return client;
  }

  private attachAccessToken(client: AxiosInstance) {
    client.interceptors.request.use(
      async (request) => {
        try {
          let accessToken = this.accessToken;
          if (!accessToken) {
            const getSessionFunc =
              typeof window === "undefined" ? auth : getSession;
            const session = await getSessionFunc();
            this.accessToken = session?.accessToken;
            accessToken = this.accessToken;
          }
          // Only add the Authorization header if a token exists
          if (accessToken) {
            request.headers.Authorization = `Bearer ${accessToken}`;
          }
        } catch (error) {
          console.log(error);
        } finally {
          return request;
        }
      },
      (error) => {
        console.error(`API Error: `, error);
        throw error;
      }
    );
  }

  public setApiToken = (accessToken?: string) => {
    this.accessToken = accessToken;
  };

  public getConversations = async (): Promise<
    {
      title: string;
      uniqueId: string;
      createdAt: string;
      models: string[];
      isDebate: boolean;
    }[]
  > => {
    try {
      const response = await this.client.get("/internal/api/v1/conversations");
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      return [];
    }
  };

  public getConversation = async (
    id: string
  ): Promise<{
    title: string;
    uniqueId: string;
    createdAt: string;
    messages: Message[];
    isDebate: boolean;
    isPublic: boolean;
    app?: {
      name: string;
      logo: string;
      uniqueId: string;
      inputSchema?: InputSchema;
      outputSchema?: OutputSchema;
    };
  } | void> => {
    try {
      const response = await this.client.get(
        `/internal/api/v1/conversations/${id}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  };

  public getModels = async (): Promise<Model[]> => {
    try {
      const response = await this.client.get("/internal/api/v1/models");
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      return [];
    }
  };

  public login = async (
    loginBody: LoginBody
  ): Promise<{
    accessToken: string;
    userId: number;
    subscriptionPlan: GengarSubscriptionPlan;
    isFirstLogin?: boolean;
  }> => {
    try {
      const response = await this.client.post("/internal/api/v1/auth/login", {
        email: loginBody.email,
        name: loginBody.name,
        avatar: loginBody.avatar,
        sub: loginBody.sub,
        source: loginBody.source,
      });

      return {
        accessToken: response.data?.accessToken,
        userId: response.data?.userId,
        subscriptionPlan: response.data?.subscriptionPlan,
        isFirstLogin: response.data?.isFirstLogin,
      };
    } catch (error) {
      console.log("error", error);
      this.handleError(error as AxiosError);
      // Throw error to stop the login process
      throw error;
    }
  };

  public getProfile = async (): Promise<{
    userId: number;
    subscriptionPlan: GengarSubscriptionPlan;
    subscriptionPlanCancelAt: Date | null;
    defaultImageModelId?: number;
    defaultTextModelId?: number;
    app?: App;
  }> => {
    try {
      const response = await this.client.get("/internal/api/v1/auth/profile");
      return {
        userId: response.data?.userId,
        subscriptionPlan: response.data?.subscriptionPlan,
        subscriptionPlanCancelAt: response.data?.subscriptionPlanCancelAt,
        defaultImageModelId: response.data?.defaultImageModelId,
        defaultTextModelId: response.data?.defaultTextModelId,
        app: response.data?.app,
      };
    } catch (error) {
      console.log("error", error);
      this.handleError(error as AxiosError);
      // Throw error to stop the login process
      throw error;
    }
  };

  public getOfficialApp = async (
    uniqueId: string
  ): Promise<App & { instruction: string }> => {
    try {
      const response = await this.client.get(
        `/internal/api/v1/apps/${uniqueId}`
      );
      return response.data;
    } catch (error) {
      console.log("error", error);
      this.handleError(error as AxiosError);
      // Throw error to stop the login process
      throw error;
    }
  };

  public getPublicDigitalClone = async (
    uniqueId: string
  ): Promise<PublicAppData> => {
    try {
      const response = await this.client.get(
        `/internal/api/v1/apps/user/${uniqueId}`
      );
      return response.data;
    } catch (error) {
      console.log("error", error);
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getOfficialApps = async (): Promise<App[]> => {
    try {
      const response = await this.client.get("/internal/api/v1/apps/official");
      return response.data;
    } catch (error) {
      console.log("error", error);
      this.handleError(error as AxiosError);
      // Throw error to stop the login process
      throw error;
    }
  };

  public getYourApps = async (): Promise<App[]> => {
    try {
      const response = await this.client.get("/internal/api/v1/apps");
      return response.data;
    } catch (error) {
      console.log("error", error);
      this.handleError(error as AxiosError);
      // Throw error to stop the login process
      throw error;
    }
  };

  public getPublicDebates = async (): Promise<
    {
      title: string;
      uniqueId: string;
      models: string[];
      createdAt: string;
      followUpQuestions: any;
      isDebate: boolean;
      category?: string;
      debateMetadata: {
        participants: Array<{
          type: string;
          model?: string;
          app?: {
            id: number;
            logo: string | null;
            name: string;
            userId: number | null;
            category: string;
            uniqueId: string;
            createdAt: string;
            updatedAt: string;
            isOfficial: boolean;
            baseModelId: number | null;
            description: string;
            displayName: string;
            inputSchema: any;
            instruction: string;
            capabilities: string[];
            outputSchema: any;
          };
          metadata?: {
            logo: string | null;
            displayName: string;
          };
        }>;
      };
    }[]
  > => {
    try {
      const response = await this.client.get(
        "/internal/api/v1/conversations/public/debates"
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      return [];
    }
  };

  public subscribe = async (
    userId: number | undefined,
    userEmail: string | undefined
  ): Promise<{ checkoutSessionId: string }> => {
    try {
      const response = await this.client.post(
        "/internal/api/v1/stripe/checkout",
        {
          userId,
          userEmail,
        }
      );

      return {
        checkoutSessionId: response.data?.id,
      };
    } catch (error) {
      console.log("error", error);
      this.handleError(error as AxiosError);
      // Throw error to stop the checkout process
      throw error;
    }
  };

  public cancelSubscription = async (): Promise<{}> => {
    try {
      const response = await this.client.post("/internal/api/v1/stripe/cancel");
      return {};
    } catch (error) {
      console.log("error", error);
      this.handleError(error as AxiosError);
      // Throw error to stop the checkout process
      throw error;
    }
  };

  public updateDefaultModels = async (
    userId: number,
    textModelId?: number,
    imageModelId?: number
  ): Promise<void> => {
    try {
      await this.client.patch(`/internal/api/v1/users/${userId}`, {
        textModelId,
        imageModelId,
      });
    } catch (error) {
      this.handleError(error as AxiosError);
      // Throw error to stop the checkout process
      // throw error;
    }
  };

  public updateUserPrompt = async (
    userId: number,
    prompt: string
  ): Promise<void> => {
    try {
      await this.client.patch(`/internal/api/v1/users/${userId}`, {
        prompt,
      });
    } catch (error) {
      this.handleError(error as AxiosError);
      // Throw error to stop the checkout process
      // throw error;
    }
  };

  public createApp = async (app: CreateAppBody): Promise<App> => {
    try {
      const response = await this.client.post(
        "/internal/api/v1/apps",
        {
          ...app,
        },
        {
          timeout: 300000, // 5 minutes for SNS data fetching and processing
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public deleteApp = async (uniqueId: string): Promise<void> => {
    try {
      await this.client.delete(`/internal/api/v1/apps/${uniqueId}`);
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public updateApp = async (
    appUniqueId: string,
    app: UpdateAppBody
  ): Promise<App> => {
    try {
      const response = await this.client.patch(
        `/internal/api/v1/apps/${appUniqueId}`,
        {
          ...app,
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getSharedConversation = async (id: string): Promise<Conversation> => {
    this.logger.info(`[API] Fetching shared conversation with ID: ${id}`);
    try {
      // Assuming the endpoint needs the /internal prefix like others
      const response = await this.client.get<Conversation>(
        `/internal/api/v1/conversations/${id}/shared`
      );
      this.logger.info(
        `[API] Successfully fetched shared conversation: ${id}`,
        response.data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `[API] Error fetching shared conversation ${id}:`,
        axiosError.response?.data || axiosError.message
      );
      // Re-throw the error to be handled by the caller
      throw new Error(
        `Failed to fetch shared conversation: ${
          axiosError.response?.statusText || axiosError.message
        }`
      );
    }
  };

  // Renamed and updated to accept boolean isPublic
  public setConversationPublicStatus = async (
    conversationId: string,
    isPublic: boolean
  ): Promise<any> => {
    try {
      const response = await this.client.patch(
        `/internal/api/v1/conversations/${conversationId}`,
        {
          isPublic: isPublic, // Send the desired state
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getAppResources = async (
    appId: string,
    source: SocialNetworkType
  ): Promise<SocialContent[]> => {
    try {
      const response = await this.client.get(
        `/internal/api/v1/apps/social/${appId}/${source}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      return [];
    }
  };

  public getOAuthUrl = async (
    network: string,
    redirectUri?: string
  ): Promise<{ url: string }> => {
    try {
      const params = redirectUri
        ? `?redirect_uri=${encodeURIComponent(redirectUri)}`
        : "";
      const response = await this.client.get(
        `/internal/api/v1/apps/oauth/${network}${params}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getPublishedApps = async (): Promise<App[]> => {
    try {
      const response = await this.client.get(
        "/internal/api/v1/apps/public/published"
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getPublishedDigitalClones = async (): Promise<App[]> => {
    try {
      const response = await this.client.get(
        "/internal/api/v1/apps/public/digital-clones"
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  private cleanAppName(name: string): string {
    return name.startsWith("@") ? name.slice(1) : name;
  }

  public getPublishedApp = async (
    name: string
  ): Promise<App & { instruction: string }> => {
    try {
      const cleanName = this.cleanAppName(name);
      const response = await this.client.get(
        `/internal/api/v1/apps/public/${cleanName}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getPublishedAppSocialContent = async (
    name: string,
    source: string
  ): Promise<any> => {
    try {
      const cleanName = this.cleanAppName(name);
      const response = await this.client.get(
        `/internal/api/v1/apps/public/social/${cleanName}/${source}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getPublishedAppTimeline = async (
    name: string,
    page: number = 1,
    limit: number = 20,
    source?: string
  ): Promise<{
    items: Array<{
      id: number;
      source: string;
      content: string;
      type: string;
      externalId: string;
      socialContentCreatedAt: string | null;
      createdAt: string;
      metadata?: any;
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> => {
    try {
      const cleanName = this.cleanAppName(name);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (source) params.append("source", source);

      const response = await this.client.get(
        `/internal/api/v1/apps/public/${cleanName}/timeline?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getPublishedAppAbout = async (
    name: string
  ): Promise<{ about: string | null }> => {
    try {
      const cleanName = this.cleanAppName(name);
      const response = await this.client.get(
        `/internal/api/v1/apps/public/${cleanName}/about`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getPublishedAppKnowledgeGraph = async (
    name: string
  ): Promise<{
    knowledgeGraph: {
      nodes: Array<{
        id: string;
        label: string;
        type: string;
        weight: number;
      }>;
      edges: Array<{ source: string; target: string; label: string }>;
    } | null;
  }> => {
    try {
      const cleanName = this.cleanAppName(name);
      const response = await this.client.get(
        `/internal/api/v1/apps/public/${cleanName}/knowledge-graph`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getAppBasicAnalytics = async (
    uniqueId: string
  ): Promise<{ totalConversations: number; totalMessages: number }> => {
    try {
      const response = await this.client.get(
        `/internal/api/v1/apps/${uniqueId}/analytics/basic`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getAppAnalytics = async (
    uniqueId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const query = params.toString();
      const response = await this.client.get(
        `/internal/api/v1/apps/${uniqueId}/analytics${query ? `?${query}` : ""}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getAppConversations = async (
    uniqueId: string,
    startDate?: string,
    endDate?: string,
    limit?: number,
    offset?: number
  ): Promise<any> => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (limit !== undefined) params.append("limit", limit.toString());
      if (offset !== undefined) params.append("offset", offset.toString());

      const query = params.toString();
      const response = await this.client.get(
        `/internal/api/v1/apps/${uniqueId}/analytics/conversations${query ? `?${query}` : ""}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getAppEngagementMetrics = async (
    uniqueId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    avgMessagesPerConversation: number;
    uniqueUsers: number;
    repeatVisitorRate: number;
    totalConversations: number;
  }> => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const query = params.toString();
      const response = await this.client.get(
        `/internal/api/v1/apps/${uniqueId}/analytics/engagement${query ? `?${query}` : ""}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getAppTopQuestions = async (
    uniqueId: string,
    limit: number = 10
  ): Promise<{
    questions: Array<{ question: string; count: number }>;
  }> => {
    try {
      const response = await this.client.get(
        `/internal/api/v1/apps/${uniqueId}/analytics/top-questions?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getAppTopicBreakdown = async (
    uniqueId: string
  ): Promise<{
    topics: Array<{ category: string; count: number; percentage: number }>;
  }> => {
    try {
      const response = await this.client.get(
        `/internal/api/v1/apps/${uniqueId}/analytics/topics`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public syncDataSource = async (
    appUniqueId: string,
    sourceName: string
  ): Promise<{ message: string }> => {
    try {
      const response = await this.client.post(
        `/internal/api/v1/apps/${appUniqueId}/source/${sourceName}/sync`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getSuggestedQuestions = async (
    appUniqueId: string
  ): Promise<{ mode: "manual" | "ai-generated"; questions: string[] }> => {
    try {
      const response = await this.client.get(
        `/internal/api/v1/apps/${appUniqueId}/suggested-questions`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public getPublishedAppSuggestedQuestions = async (
    appName: string
  ): Promise<{ mode: "manual" | "ai-generated"; questions: string[] }> => {
    try {
      const response = await this.client.get(
        `/internal/api/v1/apps/public/${appName}/suggested-questions`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public generateSuggestedQuestions = async (
    description: string,
    instruction: string,
    numberOfQuestions: number
  ): Promise<{ questions: string[] }> => {
    try {
      const response = await this.client.post(
        `/internal/api/v1/apps/generate-suggested-questions`,
        { description, instruction, numberOfQuestions }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  public validateSocialHandle = async (
    platform: "linkedin" | "twitter",
    username: string
  ): Promise<{
    valid: boolean;
    profileSummary?: {
      name: string;
      headline?: string;
      avatar?: string;
      bio?: string;
    };
    error?: string;
  }> => {
    try {
      const response = await this.client.post(
        "/internal/api/v1/apps/validate-social-handle",
        { platform, username }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  };

  private handleError(error: AxiosError) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      this.logger.error("1:", error.message);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      this.logger.error("2:", error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      this.logger.error("3:", error);
    }
  }
}

const gengarApi = new GengarApi();

export { gengarApi };
