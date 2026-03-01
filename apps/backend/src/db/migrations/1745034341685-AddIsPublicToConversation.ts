import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddIsPublicToConversation1745034341685 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "conversations",
      new TableColumn({
        name: "isPublic",
        type: "boolean",
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("conversations", "isPublic");
  }
}
