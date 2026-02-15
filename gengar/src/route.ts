import type { Routes } from "@nestjs/core";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { CompletionsModule } from "./modules/completions/completions.module";
import { ModelsModule } from "./modules/models/models.module";
import { AuthModule } from "./modules/auth/auth.module";
import { StripeModule } from "./modules/stripe/stripe.module";
import { UsersModule } from "./modules/users/users.module";
import { AppsModule } from "./modules/apps/apps.module";
import { AppAnalyticsModule } from "./modules/app-analytics/app-analytics.module";
export const route: Routes = [
  {
    path: "internal/api/v1",
    module: ConversationsModule,
  },
  {
    path: "internal/api/v1",
    module: CompletionsModule,
    children: [],
  },
  {
    path: "internal/api/v1",
    module: ModelsModule,
    children: [],
  },
  {
    path: "internal/api/v1",
    module: AuthModule,
    children: [],
  },
  {
    path: "internal/api/v1",
    module: StripeModule,
    children: [],
  },
  {
    path: "internal/api/v1",
    module: UsersModule,
    children: [],
  },
  {
    path: "internal/api/v1",
    module: AppsModule,
    children: [],
  },
  {
    path: "internal/api/v1",
    module: AppAnalyticsModule,
    children: [],
  },
];
