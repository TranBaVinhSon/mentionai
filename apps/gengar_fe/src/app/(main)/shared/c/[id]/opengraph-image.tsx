import { ImageResponse } from "next/og";
import { gengarApi } from "@/services/api";

export const alt = "AI Tools | MentionAI";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Helper function to extract participants
function getParticipants(conversation: any): string[] {
  if (!conversation) return [];

  if (conversation.debateMetadata?.participants) {
    return conversation.debateMetadata.participants.map((participant: any) => {
      if (participant.app) {
        return participant.app.displayName || participant.app.name;
      }
      if (participant.model) {
        return participant.model;
      }
      return participant.type;
    });
  }

  return [];
}

export default async function Image({ params }: { params: { id: string } }) {
  try {
    const conversation = await gengarApi.getSharedConversation(params.id);
    const title = conversation?.title || "Shared Conversation";
    const participantsList = getParticipants(conversation);
    const description =
      participantsList.length > 0
        ? `Discussion with ${participantsList.join(", ")}`
        : "Join the discussion with AI models";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "40px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "15px",
              backgroundColor: "rgba(243, 244, 246, 0.9)",
              padding: "60px",
              maxWidth: "90%",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                color: "black",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                borderRadius: "6px",
                padding: "4px 12px",
                marginBottom: "16px",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              MentionAI
            </div>
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "black",
                textAlign: "center",
                marginBottom: "20px",
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: "28px",
                color: "rgba(0, 0, 0, 0.8)",
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              {description}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Security-Policy":
            "script-src 'none'; frame-src 'none'; sandbox;",
        },
      }
    );
  } catch (error) {
    // Return default image response on error
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "40px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "15px",
              backgroundColor: "rgba(243, 244, 246, 0.9)",
              padding: "60px",
              maxWidth: "90%",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                color: "black",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                borderRadius: "6px",
                padding: "4px 12px",
                marginBottom: "16px",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              MentionAI
            </div>
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "black",
                textAlign: "center",
                marginBottom: "20px",
                lineHeight: 1.3,
              }}
            >
              Shared Conversation
            </div>
            <div
              style={{
                fontSize: "28px",
                color: "rgba(0, 0, 0, 0.8)",
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              Join the discussion with AI models
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Security-Policy":
            "script-src 'none'; frame-src 'none'; sandbox;",
        },
      }
    );
  }
}
