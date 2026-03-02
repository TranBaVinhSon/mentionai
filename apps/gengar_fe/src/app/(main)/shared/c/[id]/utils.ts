// Helper function to extract participants

interface App {
  id: number;
  logo: string | null;
  name: string;
  userId: number | null;
  category: string;
  uniqueId: string;
  createdAt: string;
  updatedAt: string;
  isOfficial: boolean;
  baseModelId: number | null;
  description: string;
  displayName: string;
  inputSchema: any;
  instruction: string;
  capabilities: string[];
  outputSchema: any;
}

interface Participant {
  type: string;
  model?: string;
  app?: App;
}

interface Conversation {
  id: string;
  messages: any[];
  title: string;
  createdAt: string;
  debateMetadata?: {
    participants: Participant[];
  };
}

export const getParticipants = (conversation: Conversation | null): string[] => {
  if (!conversation) return [];
  
  // Use debateMetadata.participants if available
  if (conversation.debateMetadata?.participants) {
    return conversation.debateMetadata.participants.map((participant) => {
      // If it's an app, use the display name or name
      if (participant.app) {
        return participant.app.displayName || participant.app.name;
      }
      // If it's a model, use that
      if (participant.model) {
        return participant.model;
      }
      // Fallback to type
      return participant.type;
    });
  }

  // Return empty array if no participants found
  return [];
};
