import { BadRequestException, Injectable } from "@nestjs/common";
import { GengarSubscriptionPlan, User } from "src/db/entities/user.entity";
import { UserRepository } from "src/db/repositories/user.repository";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AVAILABLE_MODELS } from "src/config/constants";

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneByEmail(email);
  }

  async updateUserAfterPayment(
    userId: number,
    {
      subscriptionPlan,
      stripeCustomerId,
      stripeSubscriptionId,
    }: {
      subscriptionPlan: GengarSubscriptionPlan;
      stripeCustomerId: string;
      stripeSubscriptionId: string;
    },
  ) {
    return await this.userRepository.update(
      { id: userId },
      {
        subscriptionPlan,
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
        subscriptionPlanCancelAt: null, // Reset the cancel at time after second payment
      },
    );
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateUser(user: User, { textModelId, imageModelId, prompt }: UpdateUserDto) {
    const textModel = AVAILABLE_MODELS.find((model) => model.id === textModelId);

    if (textModelId && !textModel) {
      throw new BadRequestException("Invalid text model id");
    }
    const imageModel = AVAILABLE_MODELS.find((model) => model.id === imageModelId);

    if (imageModelId && !imageModel) {
      throw new BadRequestException("Invalid image model id");
    }

    const updateData: Partial<User> = {};

    if (textModel) {
      if (textModelId !== user.defaultTextModelId) {
        if (textModel.isProModel && user.subscriptionPlan !== GengarSubscriptionPlan.PLUS) {
          throw new BadRequestException("User doesn't have access to the Plus text model");
        }
        updateData.defaultTextModelId = textModelId;
      }
    }

    if (imageModel) {
      if (imageModelId !== user.defaultImageModelId) {
        if (imageModel.isProModel && user.subscriptionPlan !== GengarSubscriptionPlan.PLUS) {
          throw new BadRequestException("User doesn't have access to the Plus image model");
        }
        updateData.defaultImageModelId = imageModelId;
      }
    }

    if (prompt) {
      updateData.customPrompt = prompt;
    }

    console.log("userId", user.id, "updateData", JSON.stringify(updateData, null, 2));

    if (Object.keys(updateData).length === 0) {
      return null;
    }

    return await this.userRepository.update({ id: user.id }, updateData);
  }
}
