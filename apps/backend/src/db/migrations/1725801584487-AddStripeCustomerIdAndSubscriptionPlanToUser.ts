import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddStripeCustomerIdAndSubscriptionPlanToUser1725801584487 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "subscriptionPlan",
        type: "enum",
        enum: ["free", "plus", "premium"],
        default: "'free'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "stripeCustomerId",
        type: "varchar",
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      "users",
      new TableIndex({
        name: "IDX_USERS_STRIPE_CUSTOMER_ID",
        columnNames: ["stripeCustomerId"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("users", "IDX_USERS_STRIPE_CUSTOMER_ID");
    await queryRunner.dropColumn("users", "stripeCustomerId");
    await queryRunner.dropColumn("users", "subscriptionPlan");
  }
}
