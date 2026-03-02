import { ApiProperty } from "@nestjs/swagger";
import { GengarSubscriptionPlan } from "src/db/entities/user.entity";
import { AppResponseDto } from "src/modules/apps/dto/app-response.dto";

export class GetProfileResponseDto {
  @ApiProperty({
    description: "The unique identifier of the user",
    example: 1234,
  })
  userId: number;

  @ApiProperty({
    description: "The current subscription plan of the user",
    example: GengarSubscriptionPlan.PLUS,
    enum: GengarSubscriptionPlan,
  })
  subscriptionPlan: GengarSubscriptionPlan;

  @ApiProperty({
    description: "The date when the subscription plan will be cancelled, if applicable",
    example: "2023-12-31T23:59:59Z",
    required: false,
    nullable: true,
  })
  subscriptionPlanCancelAt: Date | null;

  @ApiProperty({
    example: 1,
    required: true,
  })
  defaultTextModelId: number;

  @ApiProperty({
    example: 14,
    required: true,
  })
  defaultImageModelId: number;

  @ApiProperty({
    description: "The user's digital version application (isMe: true)",
    type: AppResponseDto,
    required: false,
    nullable: true,
  })
  app: AppResponseDto | null;

  @ApiProperty({
    description: "Indicates whether the user has just completed their first login",
    example: true,
  })
  isFirstLogin?: boolean;
}
