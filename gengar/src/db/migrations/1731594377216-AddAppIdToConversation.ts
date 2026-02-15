import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddAppIdToConversation1731594377216 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "conversations",
      new TableColumn({
        name: "appId",
        type: "int",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("conversations", "appId");
  }
}
