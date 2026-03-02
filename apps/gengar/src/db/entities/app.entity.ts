import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Conversation } from "./conversation.entity";
import { Message } from "./message.entity";
import { AppLink } from "./app-link.entity";
import { SocialContent } from "./social-content.entity";
import { SocialCredential } from "./social-credential.entity";
import { SuggestedQuestionsConfigDto } from "src/modules/apps/dto/suggested-questions.dto";
// Define input field types
export enum AppInputFieldType {
  TEXT = "text",
  TEXTAREA = "textarea",
  SELECT = "select",
  MULTI_SELECT = "multi-select",
  NUMBER = "number",
  BOOLEAN = "boolean",
}

// Define output field types
export enum AppOutputFieldType {
  TEXT = "text",
  IMAGE = "image",
  JSON = "json",
}

// Define input field schema
export interface AppInputField {
  id: string;
  type: AppInputFieldType;
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    acceptedFileTypes?: string[];
  };
}

// Define output field schema
export interface AppOutputField {
  id: string;
  type: AppOutputFieldType;
  label: string;
  description?: string;
}

export enum AppCategory {
  WRITING = "writing",
  PROGRAMMING = "programming",
  TRANSLATION = "translation",
  LIFESTYLE = "lifestyle",
}

@Entity("apps")
export class App {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  uniqueId: string;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  logo: string | null;

  @Column({ nullable: true })
  description: string | null;

  /**
   * Public-facing, citation-backed profile content (markdown).
   * Generated via CLI and shown on public digital twin page.
   */
  @Column({ type: "text", nullable: true })
  about: string | null;

  @Column({ type: "enum", enum: AppCategory, nullable: true })
  category: AppCategory | null;

  @Column({ nullable: true })
  instruction: string;

  @Column({ nullable: true })
  baseModelId: number | null;

  @Column({ nullable: true })
  userId: number | null;

  @Column()
  isOfficial: boolean;

  @Column({ default: false })
  isMe: boolean;

  @Column({ default: false })
  isPublished: boolean;

  // AI agents
  // webSearch, imageGeneration, etc.
  @Column("simple-array", { nullable: true })
  capabilities: string[];

  @Column("jsonb", { nullable: true })
  inputSchema: {
    fields: AppInputField[];
  };

  @Column("jsonb", { nullable: true })
  outputSchema: {
    fields: AppOutputField[];
  };

  @Column("jsonb", { nullable: true })
  suggestedQuestionsConfig: SuggestedQuestionsConfigDto;

  @OneToMany(() => Conversation, (conversation) => conversation.app)
  conversations: Conversation[];

  @OneToMany(() => Message, (message) => message.app)
  messages: Message[];

  @OneToMany(() => AppLink, (appLink) => appLink.app)
  appLinks: AppLink[];

  @OneToMany(() => SocialContent, (socialContent) => socialContent.app)
  socialContents: SocialContent[];

  @OneToMany(() => SocialCredential, (socialCredential) => socialCredential.app)
  socialCredentials: SocialCredential[];

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt: Date;
}
