import { Controller, Get, Param, Query, UseGuards, Request, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AppAnalyticsService } from "./app-analytics.service";
import { AnalyticsResponseDto } from "./dto/analytics-response.dto";
import { ConversationListResponseDto } from "./dto/conversation-list-response.dto";
import { JwtAuthGuard } from "src/modules/auth/jwt-auth.guard";
import { AppsService } from "../apps/apps.service";

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

  private async checkAppOwnership(uniqueId: string, userId: number): Promise<void> {
    const app = await this.appsService.findByUniqueId(uniqueId);
    if (!app || app.userId !== userId) {
      throw new ForbiddenException("You do not have access to this app analytics");
    }
  }
}
