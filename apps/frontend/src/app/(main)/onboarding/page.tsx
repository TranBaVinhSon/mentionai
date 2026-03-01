"use client";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const { data: user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // If user already has a "me" app, redirect to it
      if (user.app?.isMe) {
        router.push(`/apps/${user.app.uniqueId}`);
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-screen flex justify-center relative items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/")}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 text-muted-foreground hover:text-foreground"
      >
        Skip
      </Button>
      <OnboardingWizard />
    </div>
  );
}
