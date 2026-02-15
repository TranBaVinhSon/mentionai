import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddModelUsageToUser1733488315991 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "modelUsage",
        type: "jsonb",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "modelUsage");
  }
}
