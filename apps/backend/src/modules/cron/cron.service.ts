import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { UserRepository } from "src/db/repositories/user.repository";

@Injectable()
export class CronService {
  constructor(private userRepository: UserRepository) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async resetMonthlyModelUsage() {
    try {
      const users = await this.userRepository.find();

      for (const user of users) {
        user.modelUsage = {
          imageGenerationCount: 0,
          textModelUsage: {
            tierOne: 0,
            tierTwo: 0,
            tierThree: 0,
          },
        };
      }

      await this.userRepository.save(users);
      console.log("Monthly model usage reset", users.length);
    } catch (error) {
      console.error(`Error resetting monthly model usage: ${error}`);
    }
  }
}
