import { Module } from "@nestjs/common";
import { ModelsController } from "./models.controller";

@Module({
  imports: [],
  controllers: [ModelsController],
  providers: [],
  exports: [],
})
export class ModelsModule {}
