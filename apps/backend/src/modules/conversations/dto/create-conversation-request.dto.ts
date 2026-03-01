import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateConversationRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: "Hello, how can I help you?",
    description: "The message to start the conversation",
  })
  message: string;

  modelIds: string[];
}
