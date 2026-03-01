import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "MentionAI - Your Mirror in the Cloud";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
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
          backgroundColor: "#000000",
          backgroundImage: "radial-gradient(circle at 25% 25%, #1a1a2e 0%, #000000 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "40px",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "120px",
              height: "120px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 20px 40px rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              M
            </div>
          </div>

          {/* Text Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
              maxWidth: "800px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "#ffffff",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              MentionAI
            </h1>
            
            <p
              style={{
                fontSize: "32px",
                color: "#a0a0a0",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Your Mirror in the Cloud
            </p>

            <p
              style={{
                fontSize: "20px",
                color: "#808080",
                margin: 0,
                lineHeight: 1.5,
                maxWidth: "600px",
              }}
            >
              Multiply your presence without cloning your time. Train MentionAI on your public posts & let it chat like you.
            </p>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}