import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { App } from "./app.entity";
import { SocialContent } from "./social-content.entity";
import { User } from "./user.entity";

export enum SocialNetworkType {
  THREADS = "threads",
  TWITTER = "twitter",
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook",
  LINKEDIN = "linkedin",
  YOUTUBE = "youtube",
  TIKTOK = "tiktok",
  REDDIT = "reddit",
  GMAIL = "gmail",
  MEDIUM = "medium",
  GITHUB = "github",
  GOODREADS = "goodreads",
  PRODUCTHUNT = "producthunt",
  SUBSTACK = "substack",
}

@Entity({ name: "social_credentials" })
export class SocialCredential {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ nullable: true })
  appId: number;

  @ManyToOne(() => App)
  @JoinColumn({ name: "appId" })
  app: App;

  @Column({
    type: "enum",
    enum: SocialNetworkType,
  })
  type: SocialNetworkType;

  @Column()
  username: string;

  @Column({ nullable: true })
  profileId: string;

  @Column({ nullable: true })
  accessToken: string;

  @Column({ nullable: true })
  refreshToken: string;

  @OneToMany(() => SocialContent, (socialContent) => socialContent.socialCredential)
  socialContents: SocialContent[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
