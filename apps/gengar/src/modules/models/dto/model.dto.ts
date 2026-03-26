import { ApiProperty } from "@nestjs/swagger";

export enum ModelType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
}

export class ModelDto {
  @ApiProperty({
    example: "gpt-4o-mini",
    description: "The unique identifier of the model",
  })
  name: string;

  @ApiProperty({
    example: "GPT-4o mini",
    description: "The display name of the model",
  })
  displayName: string;

  @ApiProperty({
    example: "Compact version of GPT-4, ideal for quick tasks with limited resources. Lacks depth in complex queries.",
    description: "A brief description of the model and its capabilities",
  })
  description: string;

  @ApiProperty({
    enum: ModelType,
    example: ModelType.TEXT,
    description: "The type of the model (multimodal, text, or image)",
  })
  modelType: ModelType;

  @ApiProperty({
    example: ["quick responses", "simple tasks"],
    description: "Labels describing the model's strengths or use cases",
  })
  labels: string[];

  @ApiProperty({
    example: ["quick responses", "simple tasks"],
    description: "Categories describing the model's strengths or use cases",
  })
  categories: string[];

  @ApiProperty({
    example: true,
    description: "Whether the model is a pro model",
  })
  isProModel: boolean;

  @ApiProperty({
    example: true,
    description: "Whether the model requires login",
  })
  isLoginRequired: boolean;
}
