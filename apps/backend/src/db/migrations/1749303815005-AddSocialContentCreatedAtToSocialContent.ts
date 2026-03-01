import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSocialContentCreatedAtToSocialContent1749303815005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "social_contents",
      new TableColumn({
        name: "socialContentCreatedAt",
        type: "timestamp",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("social_contents", "socialContentCreatedAt");
  }
}
