import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddMetadataAndRepositoryTypeToSocialContent1750505097834 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if metadata column already exists
    const hasMetadataColumn = await queryRunner.hasColumn("social_contents", "metadata");

    if (!hasMetadataColumn) {
      // Add metadata column only if it doesn't exist
      await queryRunner.addColumn(
        "social_contents",
        new TableColumn({
          name: "metadata",
          type: "jsonb",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove metadata column
    const hasMetadataColumn = await queryRunner.hasColumn("social_contents", "metadata");

    if (hasMetadataColumn) {
      await queryRunner.dropColumn("social_contents", "metadata");
    }
  }
}
