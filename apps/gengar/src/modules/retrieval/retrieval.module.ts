import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { RetrievalOrchestratorService } from "./retrieval-orchestrator.service";
import { QueryClassifierService } from "./query-classifier.service";
import { MemoryModule } from "../memory/memory.module";
import { SocialContent } from "../../db/entities/social-content.entity";
import { AppLink } from "../../db/entities/app-link.entity";
import { SocialContentRepository } from "../../db/repositories/social-content.repository";
import { AppLinkRepository } from "../../db/repositories/app-link.repository";
import { rollbarProvider } from "src/config/rollbar.provider";
import { EmbeddingsModule } from "../embeddings/embeddings.module";
import { ChromaModule } from "../chroma/chroma.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SocialContent, AppLink]),
    MemoryModule,
    EmbeddingsModule,
    ChromaModule,
    ConfigModule,
  ],
  providers: [
    RetrievalOrchestratorService,
    QueryClassifierService,
    SocialContentRepository,
    AppLinkRepository,
    rollbarProvider,
  ],
  exports: [RetrievalOrchestratorService],
})
export class RetrievalModule {}
