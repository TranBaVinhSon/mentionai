"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  User,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  messages: Message[];
}

interface ConversationListProps {
  data: {
    total: number;
    limit: number;
    offset: number;
    conversations: Conversation[];
  };
}

export function ConversationList({ data }: ConversationListProps) {
  const [expandedConversations, setExpandedConversations] = useState<
    Set<number>
  >(new Set());

  const toggleConversation = (conversationId: number) => {
    const newExpanded = new Set(expandedConversations);
    if (newExpanded.has(conversationId)) {
      newExpanded.delete(conversationId);
    } else {
      newExpanded.add(conversationId);
    }
    setExpandedConversations(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversations
        </CardTitle>
        <CardDescription>
          {data.total} conversation{data.total !== 1 ? "s" : ""} found
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No conversations found in the selected date range.
          </div>
        ) : (
          data.conversations.map((conversation) => {
            const isExpanded = expandedConversations.has(conversation.id);
            const firstUserMessage = conversation.messages.find(
              (m) => m.role === "user"
            );

            return (
              <Collapsible key={conversation.id} className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full p-4 h-auto text-left justify-start hover:bg-muted/50"
                    onClick={() => toggleConversation(conversation.id)}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-start gap-3 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {conversation.title}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {conversation.messageCount} message
                              {conversation.messageCount !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          {firstUserMessage && (
                            <p className="text-sm text-muted-foreground truncate">
                              {truncateContent(firstUserMessage.content)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(conversation.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-4 pb-4">
                  <div className="ml-7 space-y-3 border-t pt-3">
                    {conversation.messages.map((message, index) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3 p-3 rounded-lg",
                          message.role === "user"
                            ? "bg-blue-50 dark:bg-blue-950/20"
                            : "bg-gray-50 dark:bg-gray-950/20"
                        )}
                      >
                        <div className="flex-shrink-0">
                          {message.role === "user" ? (
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {message.role === "user" ? "User" : "Assistant"}
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
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}

        {data.total > data.conversations.length && (
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            Showing {data.conversations.length} of {data.total} conversations
          </div>
        )}
      </CardContent>
    </Card>
  );
}
