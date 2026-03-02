import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class Users1725713718360 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "email",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "name",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "sub",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "avatar",
            type: "varchar",
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
          {
            name: "source",
            type: "enum",
            enum: ["github", "google"],
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      "users",
      new TableIndex({
        columnNames: ["email"],
        name: "IDX_USERS_EMAIL",
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("users");
  }
}
