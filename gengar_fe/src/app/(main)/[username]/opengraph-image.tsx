import { ImageResponse } from "next/og";

export const runtime = 'edge';
export const alt = "Digital Clone Profile";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: { username: string } }) {
  const { username } = params;
  const decodedUsername = username ? decodeURIComponent(username) : "";
  const cleanUsername = decodedUsername?.startsWith("@") ? decodedUsername.slice(1) : decodedUsername;

  let app = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.mentionai.io';
    const response = await fetch(`${baseUrl}/internal/api/v1/apps/public/${cleanUsername}`);
    if (response.ok) {
      app = await response.json();
    }
  } catch (error) {
    console.error('[OG Image] Error:', error);
  }

  const displayName = app?.displayName || app?.name || cleanUsername;
  const logoUrl = app?.logo;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "white",
            padding: "60px",
            borderRadius: "20px",
          }}
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt={displayName}
              width="200"
              height="200"
              style={{
                borderRadius: "100px",
                marginBottom: "30px",
              }}
            />
          )}
          <h1 style={{ fontSize: "72px", margin: "0" }}>{displayName}</h1>
          <p style={{ fontSize: "36px", color: "#666" }}>@{cleanUsername}</p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}