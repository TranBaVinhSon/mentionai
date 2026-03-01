import { gengarApi } from "@/services/api";
import type { Metadata } from "next";
import UsernameClientPage from "./client-page";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  // Decode URL encoding first, then remove @ symbol if present
  const decodedUsername = username ? decodeURIComponent(username) : "";
  const cleanUsername = decodedUsername?.startsWith("@")
    ? decodedUsername.slice(1)
    : decodedUsername;

  try {
    const publishedApp = await gengarApi.getPublishedApp(cleanUsername);
    const title = `Talk with ${publishedApp.displayName}`;
    const description = `${publishedApp.description}`;

    // Don't include OG image URL - let Next.js handle it automatically
    return {
      title,
      description,
      openGraph: {
        title,
        description,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch (error) {
    // Fallback metadata if app is not found
    return {
      title: "Digital Mind | MentionAI",
      description: "Chat with digital minds on MentionAI",
      openGraph: {
        title: "Digital Mind | MentionAI",
        description: "Chat with digital minds on MentionAI",
      },
      twitter: {
        card: "summary_large_image",
        title: "Digital Mind | MentionAI",
        description: "Chat with digital minds on MentionAI",
      },
    };
  }
}

export default async function UsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return <UsernameClientPage username={username} />;
}
