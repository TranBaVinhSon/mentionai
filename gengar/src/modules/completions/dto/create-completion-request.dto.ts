import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsOptional, IsString, Matches, IsBoolean } from "class-validator";

export class CreateCompletionRequestDto {
  @ApiProperty({
    type: String,
    required: true,
    example: "gpt-4o-mini",
  })
  @IsString()
  @IsOptional()
  model?: string;

  // Only allow official apps for now
  // Only one app
  @ApiProperty({
    type: String,
    required: true,
    example: "english_translator",
  })
  @IsString()
  @IsOptional()
  app?: string;

  @ApiProperty({
    type: Array,
    required: true,
    example: ["gpt-4o-mini", "gpt-4o"],
  })
  @IsOptional()
  models?: string[];

  @ApiProperty({
    type: Array,
    required: false,
    example: ["app-id-1", "app-id-2"],
    description: "App IDs to use",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  apps?: string[];

  @ApiProperty({
    type: Array,
    required: true,
    example: [
      {
        role: "user",
        content: "Hello, how are you?",
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  messages: {
    role: "user" | "assistant";
    content:
      | string
      | Array<{
          type: "text" | "image";
          text?: string;
          image?: string;
        }>;

    experimental_attachments?: {
      url: string;
    }[];
  }[];

  @ApiProperty({
    type: String,
    required: false,
    example: "df062aee-3df1-4d47-9da2-776de97cc9d3",
  })
  @IsString()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, {
    message: "conversationUniqueId must be a valid UUIDv4",
  })
  conversationUniqueId?: string;

  @ApiProperty({
    type: Boolean,
    required: false,
    example: false,
  })
  isAnonymous?: boolean;

  @ApiProperty({
    type: String,
    required: false,
    example: "df062aee-3df1-4d47-9da2-776de97cc9d3",
  })
  @IsString()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, {
    message: "uniqueId must be a valid UUIDv4",
  })
  newUniqueId?: string;

  @ApiProperty({
    type: String,
    required: false,
    example: "df062aee-3df1-4d47-9da2-776de97cc9d3",
  })
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, {
    message: "messageId must be a valid UUIDv4",
  })
  messageId: string;

  @ApiProperty({
    type: Boolean,
    required: false,
    example: false,
    description: "Enable Deep Think brainstorming mode with multi-round research",
  })
  @IsOptional()
  @IsBoolean()
  isDeepThinkMode?: boolean;
}
