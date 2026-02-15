import { Module } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { StripeController } from "./stripe.controller";
import { ConfigModule } from "@nestjs/config";
import { UsersModule } from "../users/users.module";

@Module({
  providers: [StripeService],
  controllers: [StripeController],
  exports: [StripeService],
  imports: [ConfigModule, UsersModule],
})
export class StripeModule {}
