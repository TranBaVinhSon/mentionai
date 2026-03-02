import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSubscriptionIdToUser1733200584730 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "stripeSubscriptionId",
        type: "varchar",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "stripeSubscriptionId");
  }
}
