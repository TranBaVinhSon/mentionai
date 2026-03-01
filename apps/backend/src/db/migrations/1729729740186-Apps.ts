import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class Apps1729729740186 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "apps",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "name",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "uniqueId",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "displayName",
            type: "varchar",
          },
          {
            name: "category",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "logo",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "instruction",
            type: "text",
          },
          {
            name: "baseModelId",
            type: "int",
            isNullable: true,
          },
          {
            name: "isOfficial",
            type: "boolean",
            default: false,
          },
          {
            name: "capabilities",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "userId",
            type: "int",
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
      "apps",
      new TableIndex({
        columnNames: ["uniqueId"],
        name: "IDX_APPS_UNIQUE_ID",
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      "apps",
      new TableIndex({
        columnNames: ["name"],
        name: "IDX_APPS_NAME",
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      "apps",
      new TableIndex({
        columnNames: ["category"],
        name: "IDX_APPS_CATEGORY",
        isUnique: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("apps", "IDX_APPS_UNIQUE_ID");
    await queryRunner.dropIndex("apps", "IDX_APPS_NAME");
    await queryRunner.dropIndex("apps", "IDX_APPS_CATEGORY");
    await queryRunner.dropTable("apps");
  }
}
