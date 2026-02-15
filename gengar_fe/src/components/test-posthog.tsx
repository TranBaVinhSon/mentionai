'use client';

import { Button } from '@/components/ui/button';
import { usePostHog } from 'posthog-js/react';
import { useState } from 'react';

export function TestPostHog() {
  const posthog = usePostHog();
  const [eventSent, setEventSent] = useState(false);

  const sendTestEvent = () => {
    if (posthog) {
      posthog.capture('test_event', {
        test_property: 'test_value',
        timestamp: new Date().toISOString(),
        source: 'test-posthog-page'
      });
      setEventSent(true);
      setTimeout(() => setEventSent(false), 3000);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Button 
        onClick={sendTestEvent}
        className="min-w-[200px]"
      >
        Send Test Event
      </Button>
      
      {eventSent && (
        <div className="text-green-600 text-sm">
          Test event sent! Check your PostHog dashboard.
        </div>
      )}
      
      {!posthog && (
        <div className="text-red-600 text-sm">
          PostHog is not initialized. Check your environment variables.
        </div>
      )}
    </div>
  );
}