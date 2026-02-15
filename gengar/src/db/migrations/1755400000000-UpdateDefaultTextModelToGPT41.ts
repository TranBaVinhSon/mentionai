import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDefaultTextModelToGPT411755400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update the default value for new users
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "defaultTextModelId" SET DEFAULT 46
    `);

    // Update existing users who have the old default (id: 1 = gpt-4o-mini) to the new default (id: 46 = gpt-4.1)
    await queryRunner.query(`
      UPDATE "users" 
      SET "defaultTextModelId" = 46 
      WHERE "defaultTextModelId" = 1 OR "defaultTextModelId" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the default value back to 1
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "defaultTextModelId" SET DEFAULT 1
    `);

    // Revert existing users back to the old default if they have the new default
    await queryRunner.query(`
      UPDATE "users" 
      SET "defaultTextModelId" = 1 
      WHERE "defaultTextModelId" = 46
    `);
  }
}
