import { IsString, IsNumber, IsOptional, IsEnum } from "class-validator";
import { SocialNetworkType } from "../../../db/entities/social-credential.entity";

export class SocialCredentialsDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  // @IsEnum(SocialNetworkType)
  source: SocialNetworkType;
}
