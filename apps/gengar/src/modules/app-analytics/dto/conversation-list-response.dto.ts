export interface MessageDto {
  id: number;
  content: string;
  role: string;
  createdAt: Date;
}

export interface ConversationDto {
  id: number;
  userId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessageAt: Date;
  user: {
    email: string;
    avatar: string;
  };
  messages: MessageDto[];
}

export class ConversationListResponseDto {
  total: number;
  limit: number;
  offset: number;
  conversations: ConversationDto[];
}
