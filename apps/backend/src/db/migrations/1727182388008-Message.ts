import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class Message1727182388008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "messages",
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
            name: "role",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "content",
            type: "text",
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
            name: "toolName",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "toolCallId",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "toolResults",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "conversationId",
            type: "int",
            isNullable: false,
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
      "messages",
      new TableIndex({
        columnNames: ["conversationId"],
        name: "IDX_MESSAGES_CONVERSATION_ID",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("messages", "IDX_MESSAGES_CONVERSATION_ID");
    await queryRunner.dropTable("messages");
  }
}
