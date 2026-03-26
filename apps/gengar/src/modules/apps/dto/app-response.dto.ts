import { AppCategory } from "src/db/entities/app.entity";
import { SocialNetworkType } from "src/db/entities/social-credential.entity";

export class AppLinkResponseDto {
  id: number;
  link: string;
  createdAt: Date;
}

export class SocialSourceResponseDto {
  id: number;
  type: SocialNetworkType;
  username: string;
  createdAt: Date;
}

export class PublicAppResponseDto {
  id: number;
  name: string;
  displayName: string;
  logo: string;
  uniqueId: string;
  description: string | null;
  userId: number | null;
}

export class AppResponseDto {
  id: number;
  name: string;
  uniqueId: string;
  displayName: string;
  logo: string;
  description: string | null;
  about?: string | null;
  category: AppCategory | null;
  instruction: string;
  baseModelId: number | null;
  userId: number | null;
  isOfficial: boolean;
  isMe: boolean;
  isPublished: boolean;
  capabilities: string[];
  inputSchema: {
    fields: any[];
  };
  outputSchema: {
    fields: any[];
  };
  suggestedQuestionsConfig: {
    questions?: string[];
  } | null;
  createdAt: Date;
  updatedAt: Date;
  // Extended fields for isMe apps
  appLinks?: AppLinkResponseDto[];
  socialSources?: SocialSourceResponseDto[];
}
