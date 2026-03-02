import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
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
                fontSize: "48px",
                fontWeight: "bold",
                color: "black",
                textAlign: "center",
                marginBottom: "10px",
                lineHeight: 1.3,
              }}
            >
              MentionAI
            </div>
            <div
              style={{
                fontSize: "36px",
                color: "rgba(0, 0, 0, 0.8)",
                textAlign: "center",
                marginTop: "10px",
              }}
            >
              Your Mirror in the Cloud
            </div>
            <div
              style={{
                fontSize: "24px",
                color: "rgba(0, 0, 0, 0.6)",
                textAlign: "center",
                marginTop: "20px",
                lineHeight: 1.4,
              }}
            >
              Multiply your presence without cloning your time
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
