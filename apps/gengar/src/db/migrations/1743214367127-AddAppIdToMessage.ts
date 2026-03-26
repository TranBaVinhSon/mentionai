import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddAppIdToMessage1743214367127 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "messages",
      new TableColumn({
        name: "appId",
        type: "int",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("messages", "appId");
  }
}
