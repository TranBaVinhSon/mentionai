import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MemoryService } from "./memory.service";
import { SocialCredential } from "../../db/entities/social-credential.entity";
import { rollbarProvider } from "src/config/rollbar.provider";

@Module({
  imports: [TypeOrmModule.forFeature([SocialCredential])],
  providers: [MemoryService, rollbarProvider],
  exports: [MemoryService],
})
export class MemoryModule {}
