import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsUrl, IsBoolean } from "class-validator";
import { Type, Transform } from "class-transformer";
import { SocialCredentialsDto } from "./social-credentials.dto";
import { SuggestedQuestionsConfigDto } from "./suggested-questions.dto";

export class UpdateAppDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instruction?: string;

  @IsNumber()
  @IsOptional()
  baseModelId?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities?: string[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SocialCredentialsDto)
  socialCredentials?: SocialCredentialsDto[];

  @IsArray()
  @IsOptional()
  @IsUrl({}, { each: true })
  links?: string[];

  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value.map((id) => {
      const num = Number(id);
      return isNaN(num) ? id : num;
    });
  })
  removeSocialCredentialIds?: number[];

  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value.map((id) => {
      const num = Number(id);
      return isNaN(num) ? id : num;
    });
  })
  removeAppLinkIds?: number[];

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ValidateNested()
  @Type(() => SuggestedQuestionsConfigDto)
  @IsOptional()
  suggestedQuestionsConfig?: SuggestedQuestionsConfigDto;
}
