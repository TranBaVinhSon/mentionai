import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { SocialCredential } from "./social-credential.entity";
import { App } from "./app.entity";

export enum SocialContentSource {
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
  THREADS = "threads",
  TWITTER = "twitter",
  LINKEDIN = "linkedin",
  REDDIT = "reddit",
  GMAIL = "gmail",
  MEDIUM = "medium",
  GITHUB = "github",
  GOODREADS = "goodreads",
  PRODUCTHUNT = "producthunt",
  SUBSTACK = "substack",
}

export enum SocialContentType {
  POST = "post",
  COMMENT = "comment",
  EMAIL = "email",
  PROFILE = "profile",
  REPOSITORY = "repository",
  BOOK = "book",
  PRODUCT = "product",
}

@Entity("social_contents")
export class SocialContent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  source: SocialContentSource;

  @Column("text")
  content: string;

  @Column()
  type: SocialContentType;

  @Column()
  appId: number;

  @Column()
  externalId: string;

  @Column()
  socialCredentialId: number;

  @Column({ nullable: true })
  socialContentCreatedAt: Date;

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    // GitHub repository fields
    description?: string;
    clone_url?: string;
    language?: string;
    topics?: string[];
    stargazers_count?: number;
    forks_count?: number;

    // GitHub user profile fields
    company?: string;
    location?: string;
    blog?: string;
    bio?: string;
    twitter_username?: string;
    public_repos?: number;
    public_gists?: number;
    followers?: number;
    following?: number;

    // Additional fields for other platforms
    [key: string]: any;
  };

  @Column({ type: "text", nullable: true })
  embedding: string;

  @Column({ type: "tsvector", nullable: true, select: false })
  searchVector: any;

  @ManyToOne(() => SocialCredential, (socialCredential) => socialCredential.socialContents)
  socialCredential: SocialCredential;

  @ManyToOne(() => App, (app) => app.socialContents)
  app: App;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
