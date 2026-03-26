import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddAboutToApp1766000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "apps",
      new TableColumn({
        name: "about",
        type: "text",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("apps", "about");
  }
}


