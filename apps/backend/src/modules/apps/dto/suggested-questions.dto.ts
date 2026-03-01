import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";

export enum SuggestedQuestionsMode {
  MANUAL = "manual",
  AI_GENERATED = "ai-generated",
}

export class SuggestedQuestionsConfigDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  questions?: string[];
}
