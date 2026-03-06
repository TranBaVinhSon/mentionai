import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AppsService } from "./apps.service";
import { CreateAppDto } from "./dto/create-app.dto";
import { AppCategory } from "src/db/entities/app.entity";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../common/types";
import { UpdateAppDto } from "./dto/update-app.dto";
import { GenerateSuggestedQuestionsDto } from "./dto/generate-suggested-questions.dto";
import { AppResponseDto, PublicAppResponseDto } from "./dto/app-response.dto";
import { Public } from "../auth/public.decorator";

@Controller("apps")
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get("/official")
  @Public()
  async getOfficialApps(@Query("category") category?: string) {
    return await this.appsService.getOfficialApps(category as AppCategory);
  }

  @Get("/oauth/:network")
  async getOAuthUrl(
    @Param("network") network: string,
    @Query("redirect_uri") redirectUri?: string,
  ): Promise<{ url: string }> {
    return await this.appsService.getOAuthUrl(network, redirectUri);
  }

  @Get("/public/published")
  @Public()
  async getPublishedApps() {
    return await this.appsService.getPublishedApps();
  }

  @Get("/public/digital-clones")
  @Public()
  async getPublishedDigitalClones() {
    console.log("getPublishedDigitalClones");
    return await this.appsService.getPublishedDigitalClones();
  }

  @Get("/public/social/:name/:source")
  @Public()
  async getPublishedAppSocialContent(@Param("name") name: string, @Param("source") source: string) {
    return await this.appsService.getPublishedAppSocialContent(name, source);
  }

  @Get("/public/:name/about")
  @Public()
  async getPublishedAppAbout(@Param("name") name: string) {
    return await this.appsService.getPublishedAppAbout(name);
  }

  @Get("/public/:name/knowledge-graph")
  @Public()
  async getPublishedAppKnowledgeGraph(@Param("name") name: string) {
    return await this.appsService.getPublishedAppKnowledgeGraph(name);
  }

  @Get("/public/:name/timeline")
  @Public()
  async getPublishedAppTimeline(
    @Param("name") name: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("source") source?: string,
  ) {
    return await this.appsService.getPublishedAppTimeline(
      name,
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 50) : 20,
      source || undefined,
    );
  }

  @Get("/public/:name")
  @Public()
  async getPublishedApp(@Param("name") name: string): Promise<AppResponseDto> {
    return await this.appsService.getPublishedApp(name);
  }

  @Get("/public/:name/suggested-questions")
  @Public()
  async getPublishedAppSuggestedQuestions(@Param("name") name: string) {
    return await this.appsService.getPublishedAppSuggestedQuestions(name);
  }

  @Get("/social/:uniqueId/:source")
  @Public()
  @UseGuards(JwtAuthGuard)
  async getAppSocialContent(
    @Param("uniqueId") uniqueId: string,
    @Param("source") source: string,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    const userId = authenticatedRequest.user?.id || null;
    return await this.appsService.getAppSocialContent(uniqueId, source, userId);
  }

  @Get("/user/:uniqueId")
  @Public()
  async getPublicApp(@Param("uniqueId") uniqueId: string): Promise<PublicAppResponseDto> {
    return await this.appsService.getPublicApp(uniqueId);
  }

  @Get("/:uniqueId")
  @UseGuards(JwtAuthGuard)
  async getApp(
    @Param("uniqueId") uniqueId: string,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<AppResponseDto> {
    return await this.appsService.getApp(uniqueId, authenticatedRequest.user.id);
  }

  @Get("/:uniqueId/suggested-questions")
  @UseGuards(JwtAuthGuard)
  async getSuggestedQuestions(@Param("uniqueId") uniqueId: string, @Req() authenticatedRequest: AuthenticatedRequest) {
    return await this.appsService.getSuggestedQuestions(uniqueId, authenticatedRequest.user.id);
  }

  @Get("")
  @UseGuards(JwtAuthGuard)
  async getApps(@Req() authenticatedRequest: AuthenticatedRequest) {
    return await this.appsService.getApps(authenticatedRequest?.user?.id);
  }

  @Post("/")
  @UseGuards(JwtAuthGuard)
  async createApp(
    @Body() createAppDto: CreateAppDto,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<AppResponseDto> {
    // 1. Create app entity immediately
    const appResponse = await this.appsService.createAppImmediate(createAppDto, authenticatedRequest.user.id);

    // 2. Start fetching external data without await (fire-and-forget)
    this.appsService.processExternalDataAsync(createAppDto, authenticatedRequest.user.id, appResponse.id);

    // 3. Wait 10 seconds
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // 4. Return the created app information
    return appResponse;
  }

  @Post("/generate-suggested-questions")
  @UseGuards(JwtAuthGuard)
  async generateSuggestedQuestions(
    @Body() generateSuggestedQuestionsDto: GenerateSuggestedQuestionsDto,
  ): Promise<{ questions: string[] }> {
    return await this.appsService.generateSuggestedQuestionsFromInput(
      generateSuggestedQuestionsDto.description,
      generateSuggestedQuestionsDto.instruction,
      generateSuggestedQuestionsDto.numberOfQuestions,
    );
  }

  @Post("/validate-social-handle")
  @UseGuards(JwtAuthGuard)
  async validateSocialHandle(@Body() body: { platform: "linkedin" | "twitter"; username: string }): Promise<{
    valid: boolean;
    profileSummary?: { name: string; headline?: string; avatar?: string; bio?: string };
    error?: string;
  }> {
    return await this.appsService.validateSocialHandle(body.platform, body.username);
  }

  @Delete("/:uniqueId")
  @UseGuards(JwtAuthGuard)
  async deleteApp(@Param("uniqueId") uniqueId: string, @Req() authenticatedRequest: AuthenticatedRequest) {
    return await this.appsService.deleteApp(uniqueId, authenticatedRequest.user.id);
  }

  @Post("/:uniqueId/source/:sourceName/sync")
  @UseGuards(JwtAuthGuard)
  async syncDataSource(
    @Param("uniqueId") uniqueId: string,
    @Param("sourceName") sourceName: string,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    // Start sync process in background (fire and forget)
    this.appsService.syncDataSourceAsync(uniqueId, sourceName, authenticatedRequest.user.id);

    // Wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Return 200 status code
    return { message: "Sync initiated successfully" };
  }

  @Patch("/:uniqueId")
  @UseGuards(JwtAuthGuard)
  async updateApp(
    @Param("uniqueId") uniqueId: string,
    @Body() updateAppDto: UpdateAppDto,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<AppResponseDto> {
    // Check if this update includes operations that need async processing
    const hasAsyncUpdates =
      updateAppDto.socialCredentials?.length > 0 ||
      updateAppDto.links?.length > 0 ||
      updateAppDto.removeSocialCredentialIds?.length > 0 ||
      updateAppDto.removeAppLinkIds?.length > 0;

    if (hasAsyncUpdates) {
      // 1. Update app entity immediately
      const appResponse = await this.appsService.updateAppImmediate(
        uniqueId,
        updateAppDto,
        authenticatedRequest.user.id,
      );

      // 2. Start fetching external data without await (fire-and-forget)
      this.appsService.processUpdateDataAsync(uniqueId, updateAppDto, authenticatedRequest.user.id, appResponse.id);

      // 3. Wait 10 seconds
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // 4. Return the updated app information
      return appResponse;
    }

    // For updates without async processing, use the original method
    return await this.appsService.updateApp(uniqueId, updateAppDto, authenticatedRequest.user.id);
  }
}
