import { SocialNetworkType } from "@/services/api";

export interface OAuthResult {
  success: boolean;
  code?: string;
  error?: string;
  network?: SocialNetworkType;
}

export interface OAuthPopupOptions {
  width?: number;
  height?: number;
  timeout?: number; // in milliseconds
}

/**
 * Opens an OAuth popup window and handles the authentication flow
 * @param network - The social network type
 * @param appId - The app ID for the integration
 * @param options - Popup configuration options
 * @returns Promise that resolves with the OAuth result
 */
export function openOAuthPopup(
  network: SocialNetworkType,
  appId: string,
  options: OAuthPopupOptions = {}
): Promise<OAuthResult> {
  return new Promise((resolve) => {
    const {
      width = 600,
      height = 700,
      timeout = 300000, // 5 minutes
    } = options;

    // Calculate popup position (center of screen)
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // Construct the OAuth URL
    const oauthUrl = `${window.location.origin}/apps/connect?network=${network}&appId=${appId}&popup=true`;

    // Open popup window
    const popup = window.open(
      oauthUrl,
      `oauth-${network}`,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      resolve({
        success: false,
        error: "Popup was blocked. Please allow popups for this site.",
        network,
      });
      return;
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      popup.close();
      resolve({
        success: false,
        error: "Authentication timed out. Please try again.",
        network,
      });
    }, timeout);

    // Listen for messages from the popup
    const messageListener = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      // Check if this is our OAuth result message
      if (event.data && event.data.type === 'oauth-result') {
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageListener);
        popup.close();

        const { success, code, error } = event.data;
        resolve({
          success,
          code,
          error,
          network,
        });
      }
    };

    // Listen for popup being closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageListener);
        
        resolve({
          success: false,
          error: "Authentication was cancelled.",
          network,
        });
      }
    }, 1000);

    window.addEventListener('message', messageListener);
  });
}

/**
 * Sends the OAuth result back to the parent window (used in popup)
 * @param result - The OAuth result to send
 */
export function sendOAuthResult(result: Omit<OAuthResult, 'network'>) {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(
      {
        type: 'oauth-result',
        ...result,
      },
      window.location.origin
    );
    window.close();
  }
}

/**
 * Extracts OAuth parameters from URL (used in popup)
 * @param url - The URL to extract parameters from (defaults to current URL)
 * @returns Object with OAuth parameters
 */
export function extractOAuthParams(url: string = window.location.href) {
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);
  
  return {
    code: params.get('code'),
    error: params.get('error'),
    error_description: params.get('error_description'),
    state: params.get('state'),
  };
}

/**
 * Checks if we're in a popup context
 * @returns true if we're in a popup window
 */
export function isPopupContext(): boolean {
  return window.opener !== null && window.opener !== window;
}