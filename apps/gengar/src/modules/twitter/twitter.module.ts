import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ApifyTwitterService } from "./apify-twitter.service";
import { rollbarProvider } from "src/config/rollbar.provider";

@Module({
  imports: [HttpModule],
  providers: [ApifyTwitterService, rollbarProvider],
  exports: [ApifyTwitterService],
})
export class TwitterModule {}
