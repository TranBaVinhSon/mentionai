"use client";

import { useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

interface GoogleOneTapConfig {
  client_id: string;
  callback: (response: any) => void;
  cancel_on_tap_outside?: boolean;
  auto_select?: boolean;
  use_fedcm_for_prompt?: boolean;
  select_by?: "auto" | "user" | "user_1tap" | "user_2tap" | "btn" | "btn_confirm" | "btn_add_session" | "btn_confirm_add_session";
  login_hint?: string;
}

interface UseGoogleOneTapProps {
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleOneTapConfig) => void;
          prompt: (callback?: (notification: any) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export function useGoogleOneTap({
  disabled = false,
}: UseGoogleOneTapProps = {}) {
  const { data: session, status } = useSession();
  const isInitialized = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    // Don't initialize if disabled, loading, or user is already authenticated
    if (disabled || status === "loading" || session || isInitialized.current) {
      return;
    }

    const initializeGoogleOneTap = () => {
      if (!window.google?.accounts?.id) {
        console.warn("Google One Tap: Google Identity Services not loaded");
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error(
          "Google One Tap: NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured"
        );
        return;
      }

      try {
        // More conservative configuration to avoid "disallowed_useragent" errors
        // Especially important for US market where Google enforces stricter policies
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          cancel_on_tap_outside: true,
          // Disable FedCM to avoid compatibility issues with certain browsers/regions
          use_fedcm_for_prompt: false,
          // Disable auto-select to reduce aggressive prompting that triggers security checks
          auto_select: false,
        });

        // Show the One Tap prompt with better error handling
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            console.log(`One Tap not displayed: ${reason}`);
            
            // Log specific reasons that might help debugging
            if (reason === "browser_not_supported" || reason === "invalid_client") {
              console.warn(
                "Google One Tap unavailable. Users can still sign in via the standard flow."
              );
            }
          } else if (notification.isSkippedMoment()) {
            console.log(`One Tap skipped: ${notification.getSkippedReason()}`);
          }
        });

        isInitialized.current = true;
      } catch (error) {
        console.error("Google One Tap initialization error:", error);
        // Silently fail - users can still use standard sign-in flow
      }
    };

    const handleCredentialResponse = async () => {
      try {
        // Preserve the current page URL for better UX
        const callbackUrl = pathname || "/";
        
        await signIn("google", {
          callbackUrl: callbackUrl,
          redirect: true,
        });
      } catch (error) {
        console.error("Google One Tap sign in error:", error);
      }
    };

    const loadGoogleScript = () => {
      if (
        document.querySelector(
          'script[src="https://accounts.google.com/gsi/client"]'
        )
      ) {
        initializeGoogleOneTap();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleOneTap;
      script.onerror = () => {
        console.error("Failed to load Google Identity Services script");
      };

      document.head.appendChild(script);
    };

    // Load script after a short delay to ensure the page is ready
    const timer = setTimeout(loadGoogleScript, 1000);

    return () => {
      clearTimeout(timer);
      if (window.google?.accounts?.id && isInitialized.current) {
        window.google.accounts.id.cancel();
      }
    };
  }, [disabled, session, status]);

  const cancel = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
    }
  };

  return { cancel };
}
