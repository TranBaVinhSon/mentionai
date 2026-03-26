import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCategoryAndMessageCountToConversation1745503353522 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "conversations",
      new TableColumn({
        name: "category",
        type: "varchar",
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      "conversations",
      new TableColumn({
        name: "messageCount",
        type: "int",
        default: 0,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("conversations", "messageCount");
    await queryRunner.dropColumn("conversations", "category");
  }
}
