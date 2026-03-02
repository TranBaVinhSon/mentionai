import { IsString, IsNumber, IsArray, IsNotEmpty, IsOptional, ValidateNested, IsUrl, IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { SocialCredentialsDto } from "./social-credentials.dto";
import { SuggestedQuestionsConfigDto } from "./suggested-questions.dto";

export class CreateAppDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsOptional()
  logo: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  instruction: string;

  @IsNumber()
  @IsOptional()
  baseModelId: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities: string[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SocialCredentialsDto)
  socialCredentials?: SocialCredentialsDto[];

  @IsArray()
  @IsOptional()
  @IsUrl({}, { each: true })
  links?: string[];

  @IsBoolean()
  @IsOptional()
  isMe: boolean;

  @IsBoolean()
  @IsOptional()
  isPublished: boolean;

  @ValidateNested()
  @Type(() => SuggestedQuestionsConfigDto)
  @IsOptional()
  suggestedQuestionsConfig?: SuggestedQuestionsConfigDto;
}
