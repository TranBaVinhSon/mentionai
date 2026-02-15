import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddPublishingFieldsToAppUpdated1749304100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isPublished column
    await queryRunner.addColumn(
      "apps",
      new TableColumn({
        name: "isPublished",
        type: "boolean",
        default: false,
        isNullable: false,
      }),
    );

    // Create index for isPublished to optimize queries for published apps
    await queryRunner.createIndex(
      "apps",
      new TableIndex({
        name: "IDX_APPS_IS_PUBLISHED",
        columnNames: ["isPublished"],
      }),
    );

    // Create composite index for published apps lookup using existing name field
    await queryRunner.createIndex(
      "apps",
      new TableIndex({
        name: "IDX_APPS_PUBLISHED_NAME",
        columnNames: ["isPublished", "name"],
        where: `"isPublished" = true`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex("apps", "IDX_APPS_PUBLISHED_NAME");
    await queryRunner.dropIndex("apps", "IDX_APPS_IS_PUBLISHED");

    // Drop column
    await queryRunner.dropColumn("apps", "isPublished");
  }
}
