import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, IsUrl, IsNotEmpty, IsOptional } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "The email address of the user",
    example: "user@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "The name of the user",
    example: "John Doe",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "The URL of the user's avatar",
    example: "https://example.com/avatar.jpg",
  })
  @IsUrl()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: "The id of user from the auth provider",
    example: "1234567890",
  })
  @IsNotEmpty()
  sub: string;

  @ApiProperty({
    description: "The source of auth provider",
    example: "github",
  })
  @IsNotEmpty()
  source: "github" | "google";
}
