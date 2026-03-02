import { ImageResponse } from "next/og";

export const alt = "Digital Clone Profile";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

interface PublishedApp {
  id: number;
  name: string;
  uniqueId: string;
  displayName: string;
  logo: string;
  description: string | null;
  instruction: string;
  isPublished: boolean;
}

async function fetchAppData(name: string): Promise<PublishedApp | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://mentionai.io";
    const response = await fetch(
      `${baseUrl}/internal/api/v1/apps/public/${name}`,
      {
        headers: {
          "User-Agent": "Next.js OG Image Generator",
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch app data: ${response.status} ${response.statusText}`
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[OG Image] Error fetching app data:", error);
    return null;
  }
}

export default async function Image({ params }: { params: { name: string } }) {
  try {
    const { name } = params;

    // Decode name and remove @ symbol if present
    const decodedName = name ? decodeURIComponent(name) : "";
    const cleanName = decodedName?.startsWith("@")
      ? decodedName.slice(1)
      : decodedName;

    const app = await fetchAppData(cleanName);
    const displayName = app?.displayName || app?.name || cleanName;
    const description =
      app?.description || "Chat with digital twins on MentionAI";

    // Create initials for fallback
    const initials = displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

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
            backgroundColor: "#ffffff",
            backgroundImage:
              "linear-gradient(to bottom right, #f3f4f6, #e5e7eb)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              padding: "80px",
              maxWidth: "90%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
            }}
          >
            {/* MentionAI Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#4b5563",
                backgroundColor: "rgba(243, 244, 246, 0.8)",
                borderRadius: "8px",
                padding: "8px 16px",
                marginBottom: "32px",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              MentionAI
            </div>

            {/* Avatar - Always show initials fallback */}
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                marginBottom: "32px",
                border: "4px solid #e5e7eb",
                backgroundColor: "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "48px",
                fontWeight: "bold",
                color: "#ffffff",
                boxShadow: "0 8px 16px rgba(99, 102, 241, 0.2)",
              }}
            >
              {initials}
            </div>

            {/* Display Name */}
            <div
              style={{
                fontSize: "56px",
                fontWeight: "bold",
                color: "#111827",
                textAlign: "center",
                marginBottom: "12px",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {displayName}
            </div>

            {/* Username */}
            <div
              style={{
                fontSize: "28px",
                color: "#6b7280",
                textAlign: "center",
                marginBottom: "24px",
                fontWeight: "500",
              }}
            >
              @{app?.name || cleanName}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: "22px",
                color: "#4b5563",
                textAlign: "center",
                maxWidth: "700px",
                lineHeight: 1.5,
                marginBottom: "32px",
              }}
            >
              {description.length > 120
                ? `${description.substring(0, 120)}...`
                : description}
            </div>

            {/* CTA */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "26px",
                color: "#6366f1",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.9706 16.9706 21 12 21C10.4077 21 8.93986 20.4806 7.72845 19.5959L3 21L4.40415 16.2716C3.51936 15.0601 3 13.5923 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Chat with {displayName} on MentionAI
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("[OG Image] Unexpected error:", error);

    // Return a simple fallback that always works
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
            backgroundColor: "#ffffff",
            backgroundImage:
              "linear-gradient(to bottom right, #f3f4f6, #e5e7eb)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              padding: "80px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "#111827",
                textAlign: "center",
                marginBottom: "24px",
                lineHeight: 1.2,
              }}
            >
              MentionAI
            </div>
            <div
              style={{
                fontSize: "32px",
                color: "#6b7280",
                textAlign: "center",
                marginBottom: "16px",
              }}
            >
              Digital Clone Platform
            </div>
            <div
              style={{
                fontSize: "24px",
                color: "#6366f1",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Chat with AI Clones
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  }
}
