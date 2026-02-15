import type { Metadata } from "next";
import { Montserrat, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { themes, ThemeProvider } from "@/theming";
import { Providers } from "@/components/query-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { GoogleAnalytics } from "@next/third-parties/google";
import { PostHogProvider } from "./providers";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import LandingPage from "@/components/landing/landing-page";

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sourceSans3",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mentionai.io"),
  title: "MentionAI - Your Mirror in the Cloud",
  description:
    "Multiply your presence without cloning your time. Train MentionAI on your public posts & let it chat like you—privately for reflection or publicly for friends.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  openGraph: {
    title: "MentionAI - Your Mirror in the Cloud",
    description:
      "Multiply your presence without cloning your time. Train MentionAI on your public posts & let it chat like you—privately for reflection or publicly for friends.",
    images: ["/images/brands/mentionai.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MentionAI - Your Mirror in the Cloud",
    description:
      "Multiply your presence without cloning your time. Train MentionAI on your public posts & let it chat like you—privately for reflection or publicly for friends.",
    images: ["/images/brands/mentionai.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = {
    colorMode: "system",
    light: themes.default,
    dark: themes.dark,
  };

  const session = await auth();

  // If not authenticated, show landing page

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sourceSans3.variable} ${montserrat.variable}`}
    >
      <body>
        <SessionProvider session={session}>
          <Providers>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TooltipProvider>
                <PostHogProvider>
                  {children}
                  {/* Google One Tap provides optional quick sign-in. 
                      If unavailable (e.g., due to browser/region restrictions), 
                      users can still sign in via the standard flow at /signin */}
                  <GoogleOneTap />
                  <Toaster />
                  <Analytics />
                </PostHogProvider>
              </TooltipProvider>
            </ThemeProvider>
          </Providers>
        </SessionProvider>
      </body>
      <GoogleAnalytics gaId="G-SWP7MWNWK9" />
    </html>
  );
}
