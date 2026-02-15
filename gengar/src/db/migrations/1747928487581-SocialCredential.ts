import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class SocialCredential1747928487581 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "social_credentials",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "userId",
            type: "int",
            isNullable: false,
          },
          {
            name: "appId",
            type: "int",
            isNullable: true,
          },
          {
            name: "type",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "username",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "profileId",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "accessToken",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "refreshToken",
            type: "varchar",
            isNullable: true,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("social_credentials");
  }
}
