import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddFullTextSearchSupport1752655494162 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tsvector column for full-text search on social_contents
    await queryRunner.addColumn(
      "social_contents",
      new TableColumn({
        name: "searchVector",
        type: "tsvector",
        isNullable: true,
      }),
    );

    // Add tsvector column for full-text search on app_links
    await queryRunner.addColumn(
      "app_links",
      new TableColumn({
        name: "searchVector",
        type: "tsvector",
        isNullable: true,
      }),
    );

    // Create GIN indexes for full-text search
    await queryRunner.query(
      'CREATE INDEX idx_social_contents_searchVector ON social_contents USING GIN("searchVector")',
    );
    await queryRunner.query('CREATE INDEX idx_app_links_searchVector ON app_links USING GIN("searchVector")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query("DROP INDEX IF EXISTS idx_app_links_searchVector");
    await queryRunner.query("DROP INDEX IF EXISTS idx_social_contents_searchVector");

    // Drop columns
    await queryRunner.dropColumn("app_links", "searchVector");
    await queryRunner.dropColumn("social_contents", "searchVector");
  }
}
