import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateConversationDto {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: "Whether the conversation is publicly accessible",
    required: false,
    type: Boolean,
    example: true,
  })
  isPublic?: boolean;
}
