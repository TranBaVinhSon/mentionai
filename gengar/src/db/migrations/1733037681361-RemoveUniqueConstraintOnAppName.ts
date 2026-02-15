import { MigrationInterface, QueryRunner, TableIndex, TableUnique } from "typeorm";

export class RemoveUniqueConstraintOnAppName1733037681361 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(
      `
            SELECT 
                tc.constraint_name
            FROM 
                information_schema.table_constraints tc
            JOIN 
                information_schema.key_column_usage kcu
            ON 
                tc.constraint_name = kcu.constraint_name
            WHERE 
                tc.table_name = $1
                AND kcu.column_name = $2
                AND tc.constraint_type = 'UNIQUE'
        `,
      ["apps", "name"],
    );

    const constraintName = result[0]?.constraint_name || null;
    if (constraintName) {
      await queryRunner.dropUniqueConstraint("apps", constraintName);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      "apps",
      new TableIndex({
        columnNames: ["name"],
        name: "IDX_APPS_NAME",
        isUnique: true,
      }),
    );
  }
}
