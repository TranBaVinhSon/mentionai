import { gengarApi } from "@/services/api";
import type { Metadata } from "next";
import AppDetailClientPage from "./client-page";

type Props = {
  params: Promise<{ uniqueId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uniqueId } = await params;

  try {
    // Fetch official apps to find the app details
    const officialApps = await gengarApi.getOfficialApps();
    const app = officialApps.find((app) => app.uniqueId === uniqueId);

    if (!app) {
      return {
        title: "App Not Found | MentionAI",
        description: "The requested app could not be found.",
      };
    }

    const title = `${app.displayName} | MentionAI`;
    const description = app.description || `Use ${app.displayName} on MentionAI`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: app.logo ? [app.logo] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: app.logo ? [app.logo] : undefined,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for app:", error);
    return {
      title: "App | MentionAI",
      description: "Explore AI-powered apps on MentionAI",
    };
  }
}

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ uniqueId: string }>;
}) {
  const { uniqueId } = await params;

  return <AppDetailClientPage uniqueId={uniqueId} />;
}