import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddKnowledgeGraphToApp1767000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "apps",
      new TableColumn({
        name: "knowledgeGraph",
        type: "jsonb",
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("apps", "knowledgeGraph");
  }
}
