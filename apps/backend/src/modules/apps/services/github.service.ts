import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import axios from "axios";
import { BaseSnsService } from "./base-sns.service";

// Define interfaces for GitHub API responses
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  language: string | null;
  languages_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  size: number;
  topics: string[];
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  private: boolean;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  default_branch: string;
  visibility: string;
  homepage: string | null;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
}

interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  blog: string | null;
  location: string | null;
  company: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

interface GitHubLanguageStats {
  [language: string]: number;
}

// Add new interfaces for contribution data and pinned repos
interface GitHubContributionDay {
  contributionCount: number;
  date: string;
}

interface GitHubContributionWeek {
  contributionDays: GitHubContributionDay[];
}

interface GitHubContributions {
  totalContributions: number;
  weeks: GitHubContributionWeek[];
}

interface GitHubPinnedRepository {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: {
    name: string;
    color: string;
  } | null;
  repositoryTopics: {
    nodes: Array<{
      topic: {
        name: string;
      };
    }>;
  };
}

// Define simplified content interface for memory storage
interface SocialContentData {
  userId: number;
  appId: number;
  source: SocialNetworkType;
  type: "profile" | "repository";
  externalId: string;
  content: string;
  metadata: any;
  createdAt: Date;
  username: string;
}

@Injectable()
export class GitHubService extends BaseSnsService {
  private readonly logger = new Logger(GitHubService.name);
  private readonly API_BASE_URL = "https://api.github.com";
  private readonly OAUTH_BASE_URL = "https://github.com/login/oauth";

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
  }

  async fetchUserContent(userId: number, accessToken: string, username: string, appId: number) {
    try {
      // Fetch user profile
      const userProfile = await this.getCurrentUserProfile(accessToken);

      // Fetch user's repositories (public only for now)
      const repositories = await this.fetchUserRepositories(accessToken);

      // Get language statistics for selected repositories
      const languageStats = await this.fetchLanguageStats(accessToken, repositories.slice(0, 10)); // Top 10 repos

      // Fetch pinned repositories
      const pinnedRepos = await this.fetchPinnedRepositories(accessToken, userProfile.login);

      // Fetch contribution data
      const contributionData = await this.fetchContributionData(accessToken, userProfile.login);

      this.logger.log(`Fetched GitHub profile and ${repositories.length} repositories for user ${userId}`);

      // Create profile entity
      const profileEntity = this.createSocialContentFromProfile(
        userProfile,
        userId,
        appId,
        username,
        languageStats,
        contributionData,
        pinnedRepos,
      );

      // Create repository entities (limit to top repositories)
      const topRepositories = repositories
        .filter((repo) => !repo.fork && !repo.private && !repo.archived) // Only original, public, non-archived repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count) // Sort by stars
        .slice(0, 20); // Limit to top 20 repositories

      const repositoryEntities = await Promise.all(
        topRepositories.map(async (repo) => {
          // Fetch additional repository statistics
          const repoStats = await this.fetchRepositoryStats(accessToken, repo.owner.login, repo.name);

          const entity = this.createSocialContentFromRepository(repo, userId, appId, username, repoStats);

          return entity;
        }),
      );

      // Combine all entities
      const contentEntities = [profileEntity, ...repositoryEntities];

      this.logger.log(
        `Successfully fetched ${contentEntities.length} GitHub items (1 profile, ${repositoryEntities.length} repositories) for user ${userId}`,
      );

      return contentEntities;
    } catch (error) {
      this.logger.error(`Error fetching GitHub content: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchUserRepositories(accessToken: string, limit = 100): Promise<GitHubRepository[]> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/user/repos`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
        params: {
          per_page: limit,
          sort: "updated",
          type: "owner", // Only repositories owned by the user
        },
      });

      return response.data || [];
    } catch (error) {
      this.logger.error(`Error fetching GitHub repositories: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchLanguageStats(
    accessToken: string,
    repositories: GitHubRepository[],
  ): Promise<Record<string, number>> {
    try {
      const languageStats: Record<string, number> = {};
      let totalBytes = 0;

      // Fetch language data for each repository
      await Promise.all(
        repositories.map(async (repo) => {
          try {
            const response = await axios.get(repo.languages_url, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
              },
            });

            const repoLanguages: GitHubLanguageStats = response.data;

            // Add to overall stats
            Object.entries(repoLanguages).forEach(([language, bytes]) => {
              languageStats[language] = (languageStats[language] || 0) + bytes;
              totalBytes += bytes;
            });
          } catch (error) {
            this.logger.warn(`Failed to fetch languages for repo ${repo.name}:`, error.message);
          }
        }),
      );

      // Convert to percentages
      const languagePercentages: Record<string, number> = {};
      Object.entries(languageStats).forEach(([language, bytes]) => {
        languagePercentages[language] = Math.round((bytes / totalBytes) * 100);
      });

      return languagePercentages;
    } catch (error) {
      this.logger.error(`Error fetching language stats: ${error.message}`);
      return {};
    }
  }

  // Fetch pinned repositories using GitHub GraphQL API
  private async fetchPinnedRepositories(accessToken: string, username: string): Promise<GitHubPinnedRepository[]> {
    try {
      const query = `
        query {
          user(login: "${username}") {
            pinnedItems(first: 6, types: REPOSITORY) {
              nodes {
                ... on Repository {
                  name
                  description
                  url
                  stargazerCount
                  forkCount
                  primaryLanguage {
                    name
                    color
                  }
                  repositoryTopics(first: 10) {
                    nodes {
                      topic {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await axios.post(
        "https://api.github.com/graphql",
        { query },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data?.data?.user?.pinnedItems?.nodes || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch pinned repositories: ${error.message}`);
      return [];
    }
  }

  // Fetch contribution data using GitHub GraphQL API
  private async fetchContributionData(accessToken: string, username: string): Promise<GitHubContributions | null> {
    try {
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - 1);

      const query = `
        query {
          user(login: "${username}") {
            contributionsCollection(from: "${fromDate.toISOString()}", to: "${toDate.toISOString()}") {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
      `;

      const response = await axios.post(
        "https://api.github.com/graphql",
        { query },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const calendar = response.data?.data?.user?.contributionsCollection?.contributionCalendar;
      if (!calendar) return null;

      return {
        totalContributions: calendar.totalContributions,
        weeks: calendar.weeks,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch contribution data: ${error.message}`);
      return null;
    }
  }

  // Fetch detailed repository statistics using GraphQL
  private async fetchRepositoryStats(accessToken: string, owner: string, repoName: string): Promise<any> {
    try {
      const query = `
        query {
          repository(owner: "${owner}", name: "${repoName}") {
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 1) {
                    totalCount
                  }
                }
              }
            }
            issues(states: OPEN) {
              totalCount
            }
            pullRequests(states: OPEN) {
              totalCount
            }
            releases(first: 1) {
              totalCount
            }
            collaborators {
              totalCount
            }
          }
        }
      `;

      const response = await axios.post(
        "https://api.github.com/graphql",
        { query },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const repo = response.data?.data?.repository;
      if (!repo) return null;

      return {
        totalCommits: repo.defaultBranchRef?.target?.history?.totalCount || 0,
        openIssues: repo.issues?.totalCount || 0,
        openPullRequests: repo.pullRequests?.totalCount || 0,
        totalReleases: repo.releases?.totalCount || 0,
        collaborators: repo.collaborators?.totalCount || 0,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch repository stats for ${owner}/${repoName}: ${error.message}`);
      return null;
    }
  }

  private createSocialContentFromProfile(
    profile: GitHubUserProfile,
    userId: number,
    appId: number,
    username: string,
    languageStats: Record<string, number>,
    contributionData: GitHubContributions | null,
    pinnedRepos: GitHubPinnedRepository[],
  ): SocialContentData {
    return {
      userId,
      appId,
      source: SocialNetworkType.GITHUB,
      type: "profile",
      externalId: profile.id.toString(),
      content: `${profile.name || profile.login}`,
      metadata: {
        ...profile,
        languages: languageStats,
        contributionData: contributionData,
        pinnedRepos: pinnedRepos,
      },
      createdAt: new Date(profile.updated_at),
      username,
    };
  }

  private createSocialContentFromRepository(
    repo: GitHubRepository,
    userId: number,
    appId: number,
    username: string,
    repoStats?: any,
  ): SocialContentData {
    return {
      userId,
      appId,
      source: SocialNetworkType.GITHUB,
      type: "repository",
      externalId: repo.id.toString(),
      content: `${repo.name} - ${repo.description || "No description"}`,
      metadata: {
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        language: repo.language,
        topics: repo.topics,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        watchers_count: repo.watchers_count,
        open_issues_count: repo.open_issues_count,
        size: repo.size,
        default_branch: repo.default_branch,
        private: repo.private,
        fork: repo.fork,
        archived: repo.archived,
        disabled: repo.disabled,
        visibility: repo.visibility,
        license: repo.license
          ? {
              key: repo.license.key,
              name: repo.license.name,
              spdx_id: repo.license.spdx_id,
            }
          : null,
        homepage: repo.homepage,
        has_issues: repo.has_issues,
        has_projects: repo.has_projects,
        has_wiki: repo.has_wiki,
        has_pages: repo.has_pages,
        pushed_at: repo.pushed_at,
        updated_at: repo.updated_at,
        created_at: repo.created_at,
        stats: repoStats,
      },
      createdAt: new Date(repo.updated_at),
      username,
    };
  }

  async getCurrentUserProfile(accessToken: string): Promise<GitHubUserProfile> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching current GitHub user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Generate OAuth authorization URL
  generateOAuthUrl(redirectUri?: string, flowType: "auth" | "apps" = "apps"): string {
    let finalRedirectUri = redirectUri;

    if (!finalRedirectUri) {
      // Always use the registered callback URL since GitHub is strict about redirect URIs
      finalRedirectUri = `${process.env.FRONTEND_URL || "http://localhost:4000"}/api/auth/callback/github`;
    }

    // Set scope based on flow type
    // For apps flow, request comprehensive permissions for profile, repos, and activity data
    const scope = flowType === "auth" ? "user:email" : "read:user,user:email,public_repo,read:org";

    // Create state parameter that includes flow type for identification
    const stateData = {
      flowType,
      timestamp: Date.now(),
      random: Math.random().toString(36).substr(2, 9),
    };
    const state = `github_${Buffer.from(JSON.stringify(stateData)).toString("base64")}`;

    // Log the redirect URI being used
    this.logger.log(`Generating GitHub OAuth URL with redirect URI: ${finalRedirectUri}`);

    // Store state for verification if needed
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      redirect_uri: finalRedirectUri,
      scope: scope,
      response_type: "code",
      state: state,
    });

    return `${this.OAUTH_BASE_URL}/authorize?${params.toString()}`;
  }

  // Exchange OAuth code for access token
  async exchangeCodeForToken(
    code: string,
    redirectUri?: string,
    flowType: "auth" | "apps" = "apps",
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    username: string;
    profileId: string;
  }> {
    try {
      this.logger.log("Exchanging GitHub authorization code for token");

      // Use the same redirect URI logic as generateOAuthUrl
      let finalRedirectUri = redirectUri;

      if (!finalRedirectUri) {
        // Always use the registered callback URL since GitHub is strict about redirect URIs
        const baseUrl =
          process.env.FRONTEND_URL ||
          (process.env.NODE_ENV === "production" ? "https://mentionai.io" : "http://localhost:4000");
        finalRedirectUri = `${baseUrl}/api/auth/callback/github`;
      }

      this.logger.log(`Using redirect URI for token exchange: ${finalRedirectUri}`);
      this.logger.log(`GitHub Client ID: ${process.env.GITHUB_CLIENT_ID}`);
      this.logger.log(`Authorization code: ${code.substring(0, 50)}...`);

      // Exchange the code for an access token
      const response = await axios.post(
        `${this.OAUTH_BASE_URL}/access_token`,
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code,
          redirect_uri: finalRedirectUri,
        },
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      const accessToken = response.data.access_token;
      const tokenType = response.data.token_type;
      const scope = response.data.scope;

      if (!accessToken) {
        throw new Error("No access token received from GitHub");
      }

      // Fetch user profile information using the access token
      const userProfile = await this.getCurrentUserProfile(accessToken);

      this.logger.log(`Fetched GitHub user profile: ${userProfile.login} (ID: ${userProfile.id})`);

      // GitHub tokens don't typically expire, but we'll set a long expiration
      return {
        accessToken: accessToken,
        // GitHub doesn't provide refresh tokens for standard OAuth flow
        expiresIn: 365 * 24 * 60 * 60, // 1 year in seconds
        username: userProfile.login,
        profileId: userProfile.id.toString(),
      };
    } catch (error) {
      this.logger.error(`Error exchanging GitHub code for token: ${error.message}`, error.stack);

      // Log the actual GitHub error response
      if (error.response?.data) {
        this.logger.error(`GitHub API error response:`, JSON.stringify(error.response.data, null, 2));
      }

      throw error;
    }
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing GITHUB content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(
        credential.userId,
        credential.accessToken,
        credential.username,
        appId,
      );

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for GITHUB app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.GITHUB,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new GITHUB content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.GITHUB;
        socialContent.content = content.content;
        socialContent.type = content.type === "repository" ? SocialContentType.REPOSITORY : SocialContentType.POST;
        socialContent.externalId = content.externalId;
        socialContent.appId = appId;
        socialContent.socialCredentialId = credential.id;
        socialContent.socialContentCreatedAt = content.createdAt;
        socialContent.metadata = content.metadata;
        return socialContent;
      });

      await this.socialContentRepository.save(contentEntities);
      this.logger.log(`Synced ${contentEntities.length} new GITHUB items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing GITHUB content for app ${appId}:`, error);
      throw error;
    }
  }
}
