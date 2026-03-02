import "dotenv/config";
import { Module } from "@nestjs/common";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { ConfigModule } from "@nestjs/config";
import { RouterModule } from "@nestjs/core";
import { route } from "./route";
import configuration from "./config/configuration";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompletionsModule } from "./modules/completions/completions.module";
import { Conversation } from "./db/entities/conversation.entity";
import { ReplicateModule } from "./modules/replicate/replicate.module";
import { ModelsModule } from "./modules/models/models.module";
import { AuthModule } from "./modules/auth/auth.module";
import { StripeModule } from "./modules/stripe/stripe.module";
import { S3HandlerModule } from "./modules/s3-handler/s3-handler.module";
import { UsersModule } from "./modules/users/users.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { AppsModule } from "./modules/apps/apps.module";
import { CronModule } from "./modules/cron/cron.module";
import { ScheduleModule } from "@nestjs/schedule";
import { rollbarProvider } from "./config/rollbar.provider";
import { MemoryModule } from "./modules/memory/memory.module";
import { RetrievalModule } from "./modules/retrieval/retrieval.module";
import { AppAnalyticsModule } from "./modules/app-analytics/app-analytics.module";

const gengarDBHostname = process.env.GENGAR_DB_HOSTNAME;
const gengarDBUsername = process.env.GENGAR_DB_USERNAME;
const gengarDBPassword = process.env.GENGAR_DB_PASSWORD;
const gengarDBName = process.env.GENGAR_DB_NAME;
const gengarDBPort = process.env.GENGAR_DB_PORT;

const loggingEnabled = process.env.DATABASE_LOGGING === "true";

const commonModules = [
  ConfigModule.forRoot({
    load: [configuration],
    isGlobal: true,
  }),
  RouterModule.register(route),
  ScheduleModule.forRoot(),

  TypeOrmModule.forRoot({
    migrationsTableName: "migrations",
    type: "postgres",
    host: gengarDBHostname,
    port: Number(gengarDBPort),
    username: gengarDBUsername,
    password: gengarDBPassword,
    database: gengarDBName,
    logging: loggingEnabled,
    entities: ["dist/src/db/entities/*.entity.js", Conversation],
    migrations: ["dist/src/db/migrations/*.js"],
    installExtensions: false, // Don't auto-install extensions
  }),

  CompletionsModule,
  ConversationsModule,
  ReplicateModule,
  ModelsModule,
  AuthModule,
  StripeModule,
  S3HandlerModule,
  UsersModule,
  MessagesModule,
  AppsModule,
  CronModule,
  MemoryModule,
  RetrievalModule,
  AppAnalyticsModule,
];

@Module({
  imports: [...commonModules],
  providers: [rollbarProvider],
})
export class AppModule {}
