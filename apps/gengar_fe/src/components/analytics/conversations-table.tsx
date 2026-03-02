"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitial } from "@/utils/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessageSquare, User, Bot, Eye } from "lucide-react";
import { MDX } from "@/components/mdx";

interface Message {
  id: number;
  content: string;
  role: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageAt: string;
  user: {
    email: string;
    avatar: string;
  };
  messages: Message[];
}

interface ConversationsTableProps {
  data: {
    total: number;
    limit: number;
    offset: number;
    conversations: Conversation[];
  };
}

export function ConversationsTable({ data }: ConversationsTableProps) {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateTitle = (title: string, maxLength = 50) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
  };

  const getUserInitials = (email: string) => {
    return email.split("@")[0].charAt(0).toUpperCase();
  };

  return (
    <div>
      <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
        <MessageSquare className="size-5" />
        Conversations
      </h2>

      {data.conversations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No conversations found in the selected date range.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.conversations.map((conversation) => (
                <TableRow key={conversation.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="size-6">
                        <AvatarImage
                          src={conversation.user.avatar}
                          alt={conversation.user.email}
                        />
                        <AvatarFallback className={cn("text-xs text-white font-medium", getAvatarColor(conversation.user.email))}>
                          {getUserInitials(conversation.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          {conversation.user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <span className="text-sm font-medium ">
                        {truncateTitle(conversation.title)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {conversation.messageCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(conversation.lastMessageAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(conversation.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedConversation(conversation)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-[400px] sm:w-[540px]">
                        <SheetHeader>
                          <SheetTitle className="flex items-center gap-2">
                            <MessageSquare className="size-4" />
                            {conversation.title}
                          </SheetTitle>
                          <SheetDescription>
                            <div className="flex items-center gap-2 mt-2">
                              <Avatar className="size-6">
                                <AvatarImage
                                  src={conversation.user.avatar}
                                  alt={conversation.user.email}
                                />
                                <AvatarFallback className="text-xs">
                                  {getUserInitials(conversation.user.email)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {conversation.user.email}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {conversation.messageCount} messages
                              </Badge>
                            </div>
                          </SheetDescription>
                        </SheetHeader>
                        <div className="mt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                          {conversation.messages.map((message) => (
                            <div
                              key={message.id}
                              className={cn(
                                "flex gap-3 p-3 rounded-lg",
                                message.role === "user"
                                  ? "bg-blue-50 dark:bg-blue-950/20"
                                  : "bg-gray-50 dark:bg-gray-950/20"
                              )}
                            >
                              <div className="flex-shrink-0 mt-1">
                                {message.role === "user" ? (
                                  <User className="size-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Bot className="size-4 text-gray-600 dark:text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {message.role === "user"
                                      ? "User"
                                      : "Assistant"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(message.createdAt)}
                                  </span>
                                </div>
                                <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                                  <MDX
                                    animate={false}
                                    messageId={message.id.toString()}
                                  >
                                    {message.content}
                                  </MDX>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data.total > 0 && (
        <div className="text-center text-sm text-muted-foreground pt-4 border-t mt-4">
          Total: {data.total} conversations
        </div>
      )}
    </div>
  );
}
