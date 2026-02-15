import { IsBoolean, IsOptional } from "class-validator";

export class UpdateMessageDto {
  @IsOptional()
  @IsBoolean()
  dislike?: boolean;
}
