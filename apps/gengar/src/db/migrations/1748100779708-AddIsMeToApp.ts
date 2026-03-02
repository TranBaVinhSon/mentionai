import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddIsMeToApp1748100779708 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "apps",
      new TableColumn({
        name: "isMe",
        type: "boolean",
        default: false,
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      "apps",
      new TableIndex({
        name: "IDX_APPS_USER_ID_IS_ME",
        columnNames: ["userId", "isMe"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("apps", "IDX_APPS_USER_ID_IS_ME");
    await queryRunner.dropColumn("apps", "isMe");
  }
}
