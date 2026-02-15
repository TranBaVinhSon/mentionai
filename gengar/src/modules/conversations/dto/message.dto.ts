import { ApiResponseProperty } from "@nestjs/swagger";
import { AppDto } from "./app.dto";

export enum MessageRole {
  user = "user",
  assistant = "assistant",
}

export class MessageDto {
  @ApiResponseProperty({
    example: 1,
  })
  id: number;

  @ApiResponseProperty({
    example: "user",
    type: MessageRole,
  })
  role: MessageRole;

  @ApiResponseProperty({
    example: "I want to be a good engineer",
  })
  content: string;

  @ApiResponseProperty({
    example: [
      {
        url: "https://gengar-local.s3.ap-northeast-1.amazonaws.com/uploads/images/CH_05151_Original.jpg-dccfb34e-7bd8-4ff0-88e5-c0ba5e75c826?X-Amz-Algorithm=...",
      },
    ],
  })
  experimental_attachments: { url: string }[];

  @ApiResponseProperty({
    example: ["gpt-4o-mini", "stable-diffusion-3"],
  })
  models: string[];

  @ApiResponseProperty({
    example: 123,
  })
  appId?: number;

  @ApiResponseProperty({
    example: {
      id: 123,
      name: "Elon Musk",
      logo: "https://example.com/logo.png",
    },
  })
  app?: AppDto;

  @ApiResponseProperty({
    example: "2024-02-29T12:00:00Z",
  })
  createdAt: Date;

  @ApiResponseProperty({
    example: "webSearch",
  })
  toolName: string;

  @ApiResponseProperty({
    example: [
      {
        title: "Google",
        url: "https://www.google.com",
      },
    ],
  })
  toolResults: any[];
}
