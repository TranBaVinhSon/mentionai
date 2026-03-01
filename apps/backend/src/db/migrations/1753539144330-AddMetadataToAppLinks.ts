import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetadataToAppLinks1753539144330 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE app_links 
            ADD COLUMN metadata jsonb DEFAULT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE app_links 
            DROP COLUMN IF EXISTS metadata
        `);
  }
}
