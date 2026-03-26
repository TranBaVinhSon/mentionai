import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUserIdNullableInConversation1763000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make userId column nullable in conversations table to support anonymous conversations
    await queryRunner.query(`
      ALTER TABLE "conversations" 
      ALTER COLUMN "userId" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This migration cannot be safely reverted if there are anonymous conversations (userId = NULL)
    // First, we need to delete all anonymous conversations before adding the NOT NULL constraint
    await queryRunner.query(`
      DELETE FROM "conversations" 
      WHERE "userId" IS NULL
    `);

    // Revert userId column to NOT NULL
    await queryRunner.query(`
      ALTER TABLE "conversations" 
      ALTER COLUMN "userId" SET NOT NULL
    `);
  }
}
