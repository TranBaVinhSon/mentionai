import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDislikeToMessage1729601872446 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "messages",
      new TableColumn({
        name: "dislike",
        type: "boolean",
        default: false,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("messages", "dislike");
  }
}
