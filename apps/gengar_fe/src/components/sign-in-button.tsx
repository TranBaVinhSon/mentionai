"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import GoogleIcon from "../../public/icons/google.svg";
import GitHubIcon from "../../public/icons/github.svg";

interface SignInButtonProps {
  provider: "google" | "github";
  callbackUrl?: string | null;
}

export function SignInButton({ provider, callbackUrl }: SignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  const handleSignIn = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Use the provided callbackUrl, or the current pathname, or fallback to home
      const finalCallbackUrl = callbackUrl || pathname || "/";

      await signIn(provider, {
        callbackUrl: finalCallbackUrl,
        redirect: true
      });
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      // Ensure loading state shows for at least 2 seconds
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);

      setTimeout(() => {
        setIsLoading(false);
      }, remainingTime);
    }
  };

  const providerConfig = {
    google: {
      icon: () => (
        <Image
          src={GoogleIcon}
          alt="Google"
          width={20}
          height={20}
          className="w-5 h-5"
        />
      ),
      label: "Sign in with Google",
      className:
        "w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300",
    },
    github: {
      icon: () => (
        <Image
          src={GitHubIcon}
          alt="GitHub"
          width={20}
          height={20}
          className="w-5 h-5"
        />
      ),
      label: "Sign in with GitHub",
      className:
        "w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300",
    },
  };

  const config = providerConfig[provider];
  const IconComponent = config.icon;

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      className={`h-12 ${config.className}`}
    >
      <div className="mr-2">
        <IconComponent />
      </div>
      {isLoading ? "Signing in..." : config.label}
    </Button>
  );
}
