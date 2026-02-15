import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Conversation } from "./conversation.entity";
import { App } from "./app.entity";

interface MessageAttachment {
  key: string;
  contentType?: string;
}

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  role: string;

  @Column()
  content: string;

  @Column()
  uniqueId: string;

  @Column({ default: false })
  dislike: boolean;

  @Column("simple-array", { nullable: true })
  models?: string[];

  @Column({ nullable: true })
  appId?: number;

  // Array of S3 URLS?
  @Column("jsonb", { nullable: true })
  attachments?: MessageAttachment[];

  @Column({ nullable: true })
  toolName?: string;

  @Column({ nullable: true })
  toolCallId?: string;

  @Column("jsonb", { nullable: true })
  toolResults?: any[];

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  conversation: Conversation;

  @Column()
  conversationId: number;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;

  @ManyToOne(() => App, (app) => app.messages)
  app?: App;
}
