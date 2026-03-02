import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddFollowUpQuestionsToConversation1729088499180 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "conversations",
      new TableColumn({
        name: "followUpQuestions",
        type: "varchar",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("conversations", "followUpQuestions");
  }
}
