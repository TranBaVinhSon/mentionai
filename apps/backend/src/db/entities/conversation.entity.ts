import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Message } from "./message.entity";
import { App } from "./app.entity";
import { Model } from "src/config/constants";

interface ConversationDebateMetadata {
  // TODO: Define the schema of debate metadata
  participants: {
    app?: App;
    model?: Model;
    type: "model" | "app"; // Indicating whether this is a model or app
  }[];
  // TODO: Add more fields
}

export enum ConversationCategory {
  ENTERTAINMENT = "entertainment",
  EDUCATION = "education",
  FINANCE = "finance",
  TECH_AND_SCIENCE = "tech_and_science",
  HISTORY = "history",
  ART_AND_CULTURE = "art_and_culture",
  POLITICS = "politics",
  OTHER = "other",
}

@Entity("conversations")
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  uniqueId: string;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  appId?: number;

  @Column("simple-array")
  models: string[];

  @Column("simple-array")
  followUpQuestions: string[];

  @Column({ type: "jsonb", nullable: true, default: null })
  debateMetadata: ConversationDebateMetadata;

  @Column({ nullable: true })
  category: ConversationCategory;

  @Column({ nullable: true })
  messageCount: number;

  @Column({ default: false })
  isDebate: boolean;

  @Column({ default: false })
  isPublic: boolean;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @ManyToOne(() => User, (user) => user.conversations)
  user: User;

  @ManyToOne(() => App, (app) => app.conversations)
  app: App;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;
}
