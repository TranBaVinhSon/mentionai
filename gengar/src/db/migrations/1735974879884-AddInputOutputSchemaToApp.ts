import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddInputOutputSchemaToApp1735974879884 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "apps",
      new TableColumn({
        name: "inputSchema",
        type: "jsonb",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "apps",
      new TableColumn({
        name: "outputSchema",
        type: "jsonb",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("apps", "outputSchema");
    await queryRunner.dropColumn("apps", "inputSchema");
  }
}
