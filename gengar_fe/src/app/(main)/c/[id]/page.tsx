"use client";

import { Home } from "@/components/home";
import { gengarApi } from "@/services/api";
import { HydrationBoundary } from "@tanstack/react-query";
import { dehydrate } from "@tanstack/query-core";
import { getQueryClient } from "@/components/query-client/get-query-client";
import { Chat } from "@/components/chat";
import { useChatStore } from "@/store/chat";

export interface ChatPageProps {
  params: {
    id: string;
  };
  searchParams: {
    app?: string;
  };
}

export default function Page({ params, searchParams }: ChatPageProps) {
  const queryClient = getQueryClient();

  const isWebSearchEnabled = useChatStore((state) => state.isWebSearchEnabled);
  const isDebateMode = useChatStore((state) => state.isDebateMode);
  
  // Don't prefetch conversation data since it might not exist yet for new conversations
  // The Chat component will handle loading the conversation when it exists
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Chat
        id={params.id}
        isAnonymous={false}
        isWebSearchEnabled={isWebSearchEnabled}
        disableDebateToggle
        appParam={searchParams.app}
      />
    </HydrationBoundary>
  );
}
