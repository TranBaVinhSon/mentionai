import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/db/entities/user.entity";
import { UserRepository } from "src/db/repositories/user.repository";
import { CronService } from "./cron.service";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  exports: [CronService],
  providers: [CronService, UserRepository],
})
export class CronModule {}
