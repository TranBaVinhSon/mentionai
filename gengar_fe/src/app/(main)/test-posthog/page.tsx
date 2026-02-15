"use client";

import { TestPostHog } from "@/components/test-posthog";

export default function TestPostHogPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center space-y-6">
        <h1 className="text-3xl font-bold">PostHog Local Testing</h1>
        <p className="text-muted-foreground text-center max-w-2xl">
          Use this page to test your PostHog integration locally. 
          Make sure you&apos;ve set your environment variables correctly.
        </p>
        <TestPostHog />
        
        <div className="bg-muted p-4 rounded-lg max-w-2xl">
          <h3 className="font-semibold mb-2">Environment Variables:</h3>
          <div className="text-sm space-y-1">
            <div>Frontend: NEXT_PUBLIC_POSTHOG_KEY</div>
            <div>Backend: POSTHOG_API_KEY, POSTHOG_PROJECT_ID</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg max-w-2xl">
          <h3 className="font-semibold mb-2 text-blue-800">Next Steps:</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Click &quot;Send Test Event&quot; to verify frontend integration</li>
            <li>Check your PostHog dashboard for the test event</li>
            <li>Visit a digital clone page (/@username) to test real tracking</li>
            <li>Check the analytics dashboard to verify backend integration</li>
          </ol>
        </div>
      </div>
    </div>
  );
}