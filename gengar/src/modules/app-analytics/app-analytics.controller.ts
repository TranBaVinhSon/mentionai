import { Controller, Get, Param, Query, UseGuards, Request, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AppAnalyticsService } from "./app-analytics.service";
import { AnalyticsResponseDto } from "./dto/analytics-response.dto";
import { ConversationListResponseDto } from "./dto/conversation-list-response.dto";
import { JwtAuthGuard } from "src/modules/auth/jwt-auth.guard";
import { AppsService } from "../apps/apps.service";
import { GengarSubscriptionPlan } from "src/db/entities/user.entity";

@ApiTags("app-analytics")
@Controller("apps/:uniqueId")
export class AppAnalyticsController {
  constructor(private readonly appAnalyticsService: AppAnalyticsService, private readonly appsService: AppsService) {}

  @Get("analytics")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get analytics data for the app" })
  @ApiResponse({
    status: 200,
    description: "Analytics data retrieved successfully",
    type: AnalyticsResponseDto,
  })
  async getAnalytics(
    @Param("uniqueId") uniqueId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Request() req?: any,
  ): Promise<AnalyticsResponseDto> {
    // Check if user owns the app
    await this.checkAppOwnership(uniqueId, req.user.id);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.appAnalyticsService.getAnalytics(uniqueId, start, end);
  }

  @Get("analytics/basic")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get basic analytics (available for all plans)" })
  @ApiResponse({ status: 200, description: "Basic analytics retrieved successfully" })
  async getBasicAnalytics(
    @Param("uniqueId") uniqueId: string,
    @Request() req?: any,
  ): Promise<{ totalConversations: number; totalMessages: number }> {
    await this.checkAppOwnership(uniqueId, req.user.id);
    return this.appAnalyticsService.getBasicAnalytics(uniqueId);
  }

  @Get("analytics/conversations")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get conversation list with messages for the app" })
  @ApiResponse({
    status: 200,
    description: "Conversation list retrieved successfully",
    type: ConversationListResponseDto,
  })
  async getConversations(
    @Param("uniqueId") uniqueId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Request() req?: any,
  ): Promise<ConversationListResponseDto> {
    // Check if user owns the app
    await this.checkAppOwnership(uniqueId, req.user.id);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;

    return await this.appAnalyticsService.getConversations(uniqueId, start, end, limitNum, offsetNum);
  }

  @Get("analytics/engagement")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get engagement metrics (Plus only)" })
  async getEngagementMetrics(
    @Param("uniqueId") uniqueId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Request() req?: any,
  ) {
    await this.checkAppOwnership(uniqueId, req.user.id);
    this.requirePlusPlan(req.user);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.appAnalyticsService.getEngagementMetrics(uniqueId, start, end);
  }

  @Get("analytics/top-questions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get top questions asked (Plus only)" })
  async getTopQuestions(
    @Param("uniqueId") uniqueId: string,
    @Query("limit") limit?: string,
    @Request() req?: any,
  ) {
    await this.checkAppOwnership(uniqueId, req.user.id);
    this.requirePlusPlan(req.user);

    return this.appAnalyticsService.getTopQuestions(uniqueId, limit ? parseInt(limit, 10) : 10);
  }

  @Get("analytics/topics")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get topic breakdown (Plus only)" })
  async getTopicBreakdown(
    @Param("uniqueId") uniqueId: string,
    @Request() req?: any,
  ) {
    await this.checkAppOwnership(uniqueId, req.user.id);
    this.requirePlusPlan(req.user);

    return this.appAnalyticsService.getTopicBreakdown(uniqueId);
  }

  private requirePlusPlan(user: any): void {
    if (
      user.subscriptionPlan !== GengarSubscriptionPlan.PLUS &&
      user.subscriptionPlan !== GengarSubscriptionPlan.PREMIUM
    ) {
      throw new ForbiddenException("Plus subscription required for advanced analytics");
    }
  }

  private async checkAppOwnership(uniqueId: string, userId: number): Promise<void> {
    const app = await this.appsService.findByUniqueId(uniqueId);
    if (!app || app.userId !== userId) {
      throw new ForbiddenException("You do not have access to this app analytics");
    }
  }
}
