import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window !== 'undefined' && !window.posthog) {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: false, // We'll manually track page views for more control
        capture_pageleave: true,
        persistence: 'localStorage',
        autocapture: false, // Disable autocapture to reduce noise
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug();
        }
      });
    }
  }
};

export default posthog;