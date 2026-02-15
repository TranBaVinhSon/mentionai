import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { UsersModule } from "../users/users.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/db/entities/user.entity";
import { App } from "src/db/entities/app.entity";
import { StripeModule } from "../stripe/stripe.module";
import { AppsModule } from "../apps/apps.module";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("jwt_secret"),
        signOptions: { expiresIn: "90 days" },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    StripeModule,
    AppsModule,
    TypeOrmModule.forFeature([User, App]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
