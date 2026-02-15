import { Controller, Get, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AVAILABLE_MODELS } from "src/config/constants";
import { ModelDto } from "./dto/model.dto";

@Controller("models")
export class ModelsController {
  @Get("")
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
    example: [
      {
        title: "My first conversation",
        uniqueId: "2fc5b2d0-a3e6-4dd4-9069-864a205993a2",
        models: ["gpt-4o-mini", "perplexity"],
        createdAt: "2024-02-29T12:00:00Z",
        updatedAt: "2024-02-29T12:00:00Z",
      },
    ],
  })
  @ApiOperation({
    tags: ["Models"],
    operationId: "Get all available models",
    summary: "Get all models",
  })
  async getModels(): Promise<ModelDto[]> {
    return AVAILABLE_MODELS;
  }
}
