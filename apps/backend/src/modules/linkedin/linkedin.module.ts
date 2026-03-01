import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ApifyLinkedInService } from "./apify-linkedin.service";
import { rollbarProvider } from "src/config/rollbar.provider";

@Module({
  imports: [HttpModule],
  providers: [ApifyLinkedInService, rollbarProvider],
  exports: [ApifyLinkedInService],
})
export class LinkedInModule {}
