import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDefaultModelToUser1728885900067 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "defaultTextModelId",
        type: "int",
        default: 1, // gpt-4o-mini
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "defaultImageModelId",
        type: "int",
        default: 14, // dall-e-3
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "defaultTextModelId");
    await queryRunner.dropColumn("users", "defaultImageModelId");
  }
}
