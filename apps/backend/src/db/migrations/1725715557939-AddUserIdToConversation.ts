import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddUserIdToConversation1725715557939 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "conversations",
      new TableColumn({
        name: "userId",
        type: "int",
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      "conversations",
      new TableIndex({
        name: "IDX_CONVERSATIONS_USER_ID",
        columnNames: ["userId"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("conversations", "IDX_CONVERSATIONS_USER_ID");
    await queryRunner.dropColumn("conversations", "userId");
  }
}
