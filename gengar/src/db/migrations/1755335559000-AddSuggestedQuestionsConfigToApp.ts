import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuggestedQuestionsConfigToApp1755335559000 implements MigrationInterface {
  name = "AddSuggestedQuestionsConfigToApp1755335559000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "apps" 
      ADD COLUMN "suggestedQuestionsConfig" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "apps" 
      DROP COLUMN "suggestedQuestionsConfig"
    `);
  }
}
