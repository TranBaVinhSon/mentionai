import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCustomPromptToUser1735464508181 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "customPrompt",
        type: "text",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "customPrompt");
  }
}
