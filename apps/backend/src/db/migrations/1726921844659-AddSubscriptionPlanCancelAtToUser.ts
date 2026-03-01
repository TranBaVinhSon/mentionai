import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSubscriptionPlanCancelAtToUser1726921844659 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "subscriptionPlanCancelAt",
        type: "timestamp",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "subscriptionPlanCancelAt");
  }
}
