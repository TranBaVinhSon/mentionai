import { Module } from "@nestjs/common";
import { ReplicateService } from "./replicate.service";

@Module({
  imports: [],
  controllers: [],
  providers: [ReplicateService],
  exports: [ReplicateService],
})
export class ReplicateModule {}
