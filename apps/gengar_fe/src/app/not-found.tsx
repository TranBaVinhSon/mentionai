"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-8xl mb-6">🤖</div>
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Oops! The page you're looking for doesn't exist or isn't publicly available.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push("/")} size="lg">
            ← Back to Home
          </Button>
          <Button onClick={() => router.back()} variant="outline" size="lg">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}