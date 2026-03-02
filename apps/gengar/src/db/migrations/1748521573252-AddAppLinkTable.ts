import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AddAppLinkTable1748521573252 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "app_links",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "link",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "content",
            type: "text",
            isNullable: true,
          },
          {
            name: "appId",
            type: "int",
            isNullable: false,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "app_links",
      new TableIndex({
        name: "IDX_APP_LINKS_APP_ID",
        columnNames: ["appId"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("app_links");
  }
}
