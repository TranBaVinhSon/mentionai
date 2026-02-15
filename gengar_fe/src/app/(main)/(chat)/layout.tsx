import { ReactNode } from "react";
import { Metadata } from "next";
import LandingPage from "@/components/landing/landing-page";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  metadataBase: new URL("https://mentionai.io"),
  title: "MentionAI - Your Mirror in the Cloud",
  description:
    "Multiply your presence without cloning your time. Train MentionAI on your public posts & let it chat like you—privately for reflection or publicly for friends.",
  openGraph: {
    title: "MentionAI - Your Mirror in the Cloud",
    description:
      "Multiply your presence without cloning your time. Train MentionAI on your public posts & let it chat like you—privately for reflection or publicly for friends.",
    images: ["/images/brands/mentionai.png"],
  },
};

export default async function ChatLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
