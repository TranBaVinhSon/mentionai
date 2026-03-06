import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, ModelTierLimits, FreePlanLimits, GengarSubscriptionPlan } from "../../db/entities/user.entity";
import { AVAILABLE_MODELS } from "../../config/constants";
import { ModelType } from "../models/dto/model.dto";
import { Response } from "express";

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Checks if the user has exceeded their usage limits for the requested model.
   * Sends an error message via the Response stream if the limit is exceeded.
   * @param user - The user object.
   * @param modelName - The name of the model being requested.
   * @param res - The Express Response object to send error messages.
   * @returns True if the limit is exceeded, false otherwise.
   */
  checkUsageLimits(user: User, modelName: string, res: Response): boolean {
    const usage = user.modelUsage || {
      imageGenerationCount: 0,
      textModelUsage: {
        tierOne: 0,
        tierTwo: 0,
        tierThree: 0,
      },
    };

    let isLimitExceeded = false;

    const model = AVAILABLE_MODELS.find((m) => m.name === modelName);
    if (!model) {
      // Throwing here might be better handled by the caller,
      // but mirroring the original logic for now.
      throw new BadRequestException(`Model ${modelName} not found`);
    }

    if (model.modelType === ModelType.IMAGE || model.modelType === ModelType.VIDEO) {
      if (usage.imageGenerationCount >= ModelTierLimits.imageGeneration) {
        if (!res.writableEnded) {
          res.write(
            `data: ${JSON.stringify({
              error: "Monthly limit for image/video generation exceeded. Limit resets at the beginning of each month.",
            })}

`,
          );
        }
        isLimitExceeded = true;
      }
    } else {
      // Assuming Text models are tiers 1, 2, or 3
      if (model.tier === 2) {
        // Different limits for free vs Plus users
        const tierTwoLimit =
          user.subscriptionPlan === GengarSubscriptionPlan.FREE
            ? FreePlanLimits.maxTierTwoMessagesPerMonth
            : ModelTierLimits.tierTwo;
        if (usage.textModelUsage.tierTwo >= tierTwoLimit) {
          const upgradeHint =
            user.subscriptionPlan === GengarSubscriptionPlan.FREE
              ? " Upgrade to Plus for more advanced model access."
              : " You can use the other models such as GPT-4o-mini instead.";
          if (!res.writableEnded) {
            res.write(
              `data: ${JSON.stringify({
                error: `Monthly limit for Tier ${model.tier} models exceeded (${tierTwoLimit} messages/month). Limit resets at the beginning of each month.${upgradeHint}`,
              })}

`,
            );
          }
          isLimitExceeded = true;
        }
      } else if (model.tier === 3) {
        if (usage.textModelUsage.tierThree >= ModelTierLimits.tierThree) {
          if (!res.writableEnded) {
            res.write(
              `data: ${JSON.stringify({
                error: `Monthly limit for Tier ${model.tier} models exceeded. Limit resets at the beginning of each month. You can use the other models such as GPT-4o, Claude 3.5 Sonnet instead.`,
              })}

`,
            );
          }
          isLimitExceeded = true;
        }
      }
      // Tier 1 models might have no limit or a different check,
      // which was implicitly handled in the original code.
      // Explicitly adding a check for Tier 1 if needed:
      // else if (model.tier === 1) {
      //   if (usage.textModelUsage.tierOne >= ModelTierLimits.tierOne) { ... }
      // }
    }

    return isLimitExceeded;
  }

  /**
   * Increments the image/video generation count for the user.
   * @param user - The user object.
   */
  async incrementImageModelUsage(user: User): Promise<void> {
    const usage = user.modelUsage || {
      imageGenerationCount: 0,
      textModelUsage: {
        tierOne: 0,
        tierTwo: 0,
        tierThree: 0,
      },
    };

    // Ensure usage is initialized correctly if it was null
    if (!usage.textModelUsage) {
      usage.textModelUsage = { tierOne: 0, tierTwo: 0, tierThree: 0 };
    }
    if (usage.imageGenerationCount === undefined || usage.imageGenerationCount === null) {
      usage.imageGenerationCount = 0;
    }

    usage.imageGenerationCount += 1;
    user.modelUsage = usage;
    await this.userRepository.save(user);
  }

  /**
   * Increments the text model usage count for the user based on the model tier.
   * @param user - The user object.
   * @param modelName - The name of the text model used.
   */
  async incrementTextModelUsage(user: User, modelName: string): Promise<void> {
    const usage = user.modelUsage || {
      imageGenerationCount: 0,
      textModelUsage: {
        tierOne: 0,
        tierTwo: 0,
        tierThree: 0,
      },
    };

    // Ensure usage is initialized correctly if it was null
    if (!usage.textModelUsage) {
      usage.textModelUsage = { tierOne: 0, tierTwo: 0, tierThree: 0 };
    }
    if (usage.imageGenerationCount === undefined || usage.imageGenerationCount === null) {
      usage.imageGenerationCount = 0;
    }

    const model = AVAILABLE_MODELS.find((m) => m.name === modelName);
    if (!model) {
      // Consider logging this instead of throwing, as it shouldn't happen
      // if checkUsageLimits was called first.
      console.error(`Model ${modelName} not found during usage increment.`);
      // Or re-throw if strict checking is desired:
      // throw new BadRequestException(`Model ${modelName} not found`);
      return; // Avoid incrementing if model not found
    }

    // Ensure it's not an image/video model (safety check)
    if (model.modelType === ModelType.IMAGE || model.modelType === ModelType.VIDEO) {
      console.error(`Attempted to increment text usage for non-text model: ${modelName}`);
      // throw new BadRequestException(`Model ${modelName} is not a text model`);
      return; // Avoid incrementing
    }

    // Increment based on tier
    if (model.tier === 1) {
      usage.textModelUsage.tierOne = (usage.textModelUsage.tierOne || 0) + 1;
    } else if (model.tier === 2) {
      usage.textModelUsage.tierTwo = (usage.textModelUsage.tierTwo || 0) + 1;
    } else if (model.tier === 3) {
      usage.textModelUsage.tierThree = (usage.textModelUsage.tierThree || 0) + 1;
    }

    user.modelUsage = usage;
    await this.userRepository.save(user);
  }
}
