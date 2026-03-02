import { IsString, IsOptional } from "class-validator";

export class TrackViewDto {
  @IsString()
  visitorId: string;

  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
