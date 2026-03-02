import { ApiResponseProperty } from "@nestjs/swagger";
import { GengarSubscriptionPlan } from "src/db/entities/user.entity";

export class LoginResponseDto {
  @ApiResponseProperty({
    type: String,
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiResponseProperty({
    type: Number,
    example: 1,
  })
  userId: number;

  @ApiResponseProperty({
    type: String,
    example: GengarSubscriptionPlan.PLUS,
  })
  subscriptionPlan: GengarSubscriptionPlan;

  @ApiResponseProperty({
    type: Boolean,
    example: false,
  })
  isFirstLogin?: boolean;
}
