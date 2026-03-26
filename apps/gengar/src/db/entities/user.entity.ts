import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Conversation } from "./conversation.entity";

export enum GengarSubscriptionPlan {
  FREE = "free",
  PLUS = "plus",
  PREMIUM = "premium",
}

export const ModelTierLimits = {
  tierOne: 1000,
  tierTwo: 400,
  tierThree: 20,
  imageGeneration: 80,
};

// Having a cron job to reset the usage at the beginning of the month
// Plus plan: Generate upto 150 images per month
// Plus plan: 30 messages on Tier 3 models, 300 messages on Tier 2 models, unlimited on Tier 1 models
// Free plan: unlimited requests on Tier 1 models

export interface ModelUsage {
  imageGenerationCount: number;
  textModelUsage: {
    tierOne: number;
    tierTwo: number;
    tierThree: number;
  };
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  sub: string;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  defaultTextModelId: number;

  @Column({ nullable: true })
  defaultImageModelId: number;

  @Column({ nullable: true })
  stripeCustomerId: string;

  // Latest Stripe subscription ID
  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column({ nullable: true })
  customPrompt: string;

  @Column({ type: "jsonb", nullable: true })
  modelUsage: ModelUsage;

  @Column({
    type: "enum",
    enum: GengarSubscriptionPlan,
    default: GengarSubscriptionPlan.FREE,
  })
  subscriptionPlan: GengarSubscriptionPlan;

  @Column({ nullable: true })
  subscriptionPlanCancelAt: Date | null;

  @Column({ nullable: true })
  updatedAt: Date;

  @Column({
    type: "enum",
    enum: ["github", "google"],
  })
  source: string;

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}
