"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Image from "next/image";
import mLogo from "../../../../public/m-logo-transparent.webp";
import bannerImage from "../../../../public/images/brands/mention_ai_banner.png";
import { SignInButton } from "@/components/sign-in-button";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";

  useEffect(() => {
    if (status === "authenticated" && session) {
      // Redirect to callbackUrl - Layout component will handle onboarding redirect
      // if user doesn't have a digital twin (using fresh profile API data)
      router.push(callbackUrl);
    }
  }, [status, session, router, callbackUrl]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Column - Sign in form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src={mLogo}
              alt="MentionAI"
              width={48}
              height={48}
              className="brightness-0 invert dark:brightness-100 dark:invert-0"
            />
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome to MentionAI!
            </h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {/* Sign in buttons */}
          <div className="space-y-3">
            <SignInButton provider="google" callbackUrl={callbackUrl} />
            <SignInButton provider="github" callbackUrl={callbackUrl} />
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link
              href="/terms-of-service"
              className="underline hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column - Elegant Banner */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-primary/3 to-transparent rounded-full blur-2xl"></div>

        <div className="max-w-4xl w-full flex flex-col items-center space-y-8 relative z-10">
          {/* Elegant Image Container */}
          <div className="relative group w-full max-w-3xl">
            {/* Subtle glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Main Image Container */}
            <div className="relative transform group-hover:scale-[1.01] transition-all duration-300 ease-out">
              {/* Refined border */}
              <div className="absolute inset-0 bg-gradient-to-br from-border/50 via-border/30 to-border/50 rounded-2xl p-[1px]">
                <div className="w-full h-full bg-background rounded-2xl"></div>
              </div>

              {/* Main Image */}
              <div className="relative p-1">
                <Image
                  src={bannerImage}
                  alt="MentionAI Banner"
                  width={1200}
                  height={600}
                  className="relative rounded-xl shadow-lg w-full h-auto object-contain"
                  priority
                  quality={100}
                />

                {/* Subtle overlay for elegance */}
                <div className="absolute inset-1 bg-gradient-to-t from-black/3 via-transparent to-white/2 rounded-xl pointer-events-none"></div>
              </div>
            </div>
          </div>

          {/* Refined Content */}
          <div className="text-center space-y-6 max-w-2xl">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                Your Mirror in the Cloud{" "}
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-primary/60 to-primary/30 rounded-full mx-auto"></div>
            </div>

            <p className="text-muted-foreground text-lg leading-relaxed">
              Multiply your presence without cloning your time. Train MentionAI
              on your public posts & let it chat like you—privately for
              reflection or publicly for fans.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
