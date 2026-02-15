import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEmail, IsNotEmpty, IsNumber } from "class-validator";

export class CheckoutDto {
  @ApiProperty({
    description: "The ID of the user",
    example: 1,
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: "The email address of the user",
    example: "user@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;
}
