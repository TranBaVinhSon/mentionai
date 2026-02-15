import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsNumber, IsString } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 2,
    description: "The text model id",
  })
  textModelId?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 15,
    description: "The image model id",
  })
  imageModelId?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: "You are a helpful assistant",
    description: "The custom prompt",
  })
  prompt?: string;
}
