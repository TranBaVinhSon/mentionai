import { auth } from "@/lib/auth";
import LandingPage from "@/components/landing/landing-page";
import ChatPage from "./chat-page";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    // Non-authenticated users see the landing page
    return <LandingPage />;
  }

  // Authenticated users see the chat page
  return <ChatPage />;
}