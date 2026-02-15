import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AddSocialContentTable1748522294841 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "social_contents",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "source",
            type: "varchar",
          },
          {
            name: "content",
            type: "text",
          },
          {
            name: "type",
            type: "varchar",
          },
          {
            name: "appId",
            type: "int",
          },
          {
            name: "externalId",
            type: "varchar",
          },
          {
            name: "socialCredentialId",
            type: "int",
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
      "social_contents",
      new TableIndex({
        name: "IDX_SOCIAL_CONTENTS_APP_ID",
        columnNames: ["appId"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("social_contents");
  }
}
