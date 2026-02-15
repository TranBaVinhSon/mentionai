import { Body, Controller, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { CompletionsService } from "./completions.service";
import { Response } from "express";
import { CreateCompletionRequestDto } from "./dto/create-completion-request.dto";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../common/types";
import { Public } from "../auth/public.decorator";

// Only login users can use the image generation model
@Controller("completions")
@UseGuards(JwtAuthGuard)
export class CompletionsController {
  constructor(readonly completionsService: CompletionsService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiOperation({
    tags: ["Completions"],
    operationId: "Create completion",
    summary: "Create completion",
  })
  async createCompletion(
    @Res() res: Response,
    @Body() requestBody: CreateCompletionRequestDto,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    // Set headers for streaming JSON
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for Nginx
    res.flushHeaders(); // Flush headers immediately
    // console.log("authenticatedRequest", authenticatedRequest);

    await this.completionsService.createCompletion(requestBody, res, authenticatedRequest);

    res.end();
  }
}
