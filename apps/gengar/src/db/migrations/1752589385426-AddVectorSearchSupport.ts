import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddVectorSearchSupport1752589385426 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query("CREATE EXTENSION IF NOT EXISTS vector");

    // Add embedding column to social_contents table
    await queryRunner.addColumn(
      "social_contents",
      new TableColumn({
        name: "embedding",
        type: "vector",
        length: "1536",
        isNullable: true,
      }),
    );

    // Create index for vector similarity search on social_contents
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_social_contents_embedding ON social_contents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
    );

    // Add embedding column to app_links table
    await queryRunner.addColumn(
      "app_links",
      new TableColumn({
        name: "embedding",
        type: "vector",
        length: "1536",
        isNullable: true,
      }),
    );

    // Create index for vector similarity search on app_links
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS idx_app_links_embedding ON app_links USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query("DROP INDEX IF EXISTS idx_app_links_embedding");
    await queryRunner.query("DROP INDEX IF EXISTS idx_social_contents_embedding");

    // Remove embedding columns
    await queryRunner.dropColumn("app_links", "embedding");
    await queryRunner.dropColumn("social_contents", "embedding");

    // Note: We don't drop the pgvector extension as it might be used by other tables
  }
}
