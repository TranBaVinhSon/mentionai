import { Module } from "@nestjs/common";
import { EmbeddingsService } from "./embeddings.service";
import { rollbarProvider } from "src/config/rollbar.provider";

@Module({
  providers: [EmbeddingsService, rollbarProvider],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
