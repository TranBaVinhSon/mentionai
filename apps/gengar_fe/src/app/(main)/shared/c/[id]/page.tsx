import { gengarApi } from "@/services/api";
import { notFound } from "next/navigation";
import SharedConversationView from "@/components/shared-conversation-view";
import { type Conversation } from "@/components/shared-conversation-view";
import type { Metadata, ResolvingMetadata } from "next";
import { getParticipants } from "./utils";


type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const conversation = await gengarApi.getSharedConversation(id);
  const title = conversation?.title || "Shared Conversation";
  const participantsList = getParticipants(conversation);
  const description =
    participantsList.length > 0
      ? `Discussion with ${participantsList.join(", ")}`
      : "Join the discussion with AI models";

  return {
    title: title,
    description: description,
  };
}

// Server Component
export default async function SharedConversationPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    // Fetch conversation data on the server
    const conversation = await gengarApi.getSharedConversation(params.id);

    // If no conversation found, redirect to 404
    if (!conversation) {
      notFound();
    }

    // Render the conversation with the client component
    return <SharedConversationView conversation={conversation} />;
  } catch (error) {
    console.error("[API] Failed to fetch shared conversation:", error);
    notFound();
  }
}
