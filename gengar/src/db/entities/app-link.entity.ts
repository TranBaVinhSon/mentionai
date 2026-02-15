import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { App } from "./app.entity";

@Entity("app_links")
export class AppLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 2048 })
  @Index()
  link: string;

  @Column({ type: "text", nullable: true })
  content: string | null;

  @Column({ type: "text", nullable: true })
  embedding: string;

  @Column({ type: "tsvector", nullable: true, select: false })
  searchVector: any;

  @Column({ type: "jsonb", nullable: true })
  metadata?: {
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    siteName?: string;
  } | null;

  @Column({ type: "int" })
  @Index()
  appId: number;

  @ManyToOne(() => App, (app) => app.appLinks)
  app: App;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
