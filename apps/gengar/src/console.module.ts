import "dotenv/config";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppsModule } from "./modules/apps/apps.module";
import { MemoryModule } from "./modules/memory/memory.module";
import { RefetchDataSyncCommand } from "./commands/refetch-data-sync.command";
import { GenerateEmbeddingsCommand } from "./commands/generate-embeddings.command";
import { GenerateMetadataCommand } from "./commands/generate-metadata.command";
import { ReindexLinkedInMemoriesCommand } from "./commands/reindex-linkedin-memories.command";
import { UpdateSuggestedQuestionsCommand } from "./commands/update-suggested-questions.command";
import { SocialContent } from "./db/entities/social-content.entity";
import { AppLink } from "./db/entities/app-link.entity";
import { App } from "./db/entities/app.entity";
import { SocialContentRepository } from "./db/repositories/social-content.repository";
import { EmbeddingsModule } from "./modules/embeddings/embeddings.module";
import { ChromaModule } from "./modules/chroma/chroma.module";
import { ReindexChromaCommand } from "./commands/reindex-chroma.command";
import { AppLinkRepository } from "./db/repositories/app-link.repository";

const gengarDBHostname = process.env.GENGAR_DB_HOSTNAME;
const gengarDBUsername = process.env.GENGAR_DB_USERNAME;
const gengarDBPassword = process.env.GENGAR_DB_PASSWORD;
const gengarDBName = process.env.GENGAR_DB_NAME;
const gengarDBPort = process.env.GENGAR_DB_PORT;

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      migrationsTableName: "migrations",
      type: "postgres",
      host: gengarDBHostname,
      port: Number(gengarDBPort),
      username: gengarDBUsername,
      password: gengarDBPassword,
      database: gengarDBName,
      logging: false,
      entities: [__dirname + "/db/entities/*.entity{.ts,.js}"],
      migrations: [],
    }),
    TypeOrmModule.forFeature([SocialContent, AppLink, App]),
    AppsModule,
    MemoryModule,
    EmbeddingsModule,
    ChromaModule,
  ],
  providers: [
    SocialContentRepository,
    AppLinkRepository,
    RefetchDataSyncCommand,
    GenerateEmbeddingsCommand,
    GenerateMetadataCommand,
    ReindexLinkedInMemoriesCommand,
    UpdateSuggestedQuestionsCommand,
    ReindexChromaCommand,
  ],
})
export class ConsoleModule {}
