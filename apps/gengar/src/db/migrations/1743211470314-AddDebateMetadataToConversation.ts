import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDebateMetadataToConversation1743211470314 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("conversations", [
      new TableColumn({
        name: "debateMetadata",
        type: "jsonb",
        isNullable: true,
        default: null,
      }),
      new TableColumn({
        name: "isDebate",
        type: "boolean",
        isNullable: false,
        default: false,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns("conversations", ["debateMetadata", "isDebate"]);
  }
}
