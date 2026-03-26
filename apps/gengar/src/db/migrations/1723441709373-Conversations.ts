import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class Conversations1723441709373 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "conversations",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isNullable: false,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "title",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "uniqueId",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "models",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "messages",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "NOW()",
            onUpdate: "NOW()",
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      "conversations",
      new TableIndex({
        columnNames: ["uniqueId"],
        name: "IDX_CONVERSATIONS_UNIQUE_ID",
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("conversations");
  }
}
