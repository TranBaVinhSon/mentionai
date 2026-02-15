import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddAttachmentsToMessage1732344392313 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "messages",
      new TableColumn({
        name: "attachments",
        type: "jsonb",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("messages", "attachments");
  }
}
