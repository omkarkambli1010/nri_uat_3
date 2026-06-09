'use client';

import { useCallback, useState } from 'react';
import { environment } from '@/environments/environment';

export type GooglePayload = {
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  sub?: string;
  given_name?: string;
  family_name?: string;
};

export type GooglePromptBlockedData = {
  type: 'not_displayed' | 'skipped' | 'unknown';
  reason: string;
};

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
  clientId?: string;
};

type UseGoogleSignInParams = {
  clientId?: string;
  promptParentId?: string;

  fallbackRedirectUrl?: string;
  fallbackClientCode?: string | null;

  googleErrorSessionKey?: string;

  onSuccess?: (
    payload: GooglePayload,
    credential: string
  ) => void | Promise<void>;

  onError?: (error: unknown) => void;

  onPromptBlocked?: (data: GooglePromptBlockedData) => void;

  onFallbackRedirect?: (url: string) => void;

  onLoadingChange?: (loading: boolean) => void;
};

export function useGoogleSignIn({
  clientId = environment.googleClientId,
  promptParentId = 'one-tap-container',
  fallbackRedirectUrl,
  fallbackClientCode,
  googleErrorSessionKey = 'GoogleError',
  onSuccess,
  onError,
  onPromptBlocked,
  onFallbackRedirect,
  onLoadingChange,
}: UseGoogleSignInParams = {}) {
  const [loading, setLoading] = useState(false);

  const startLoading = useCallback(() => {
    setLoading(true);
    onLoadingChange?.(true);
  }, [onLoadingChange]);

  const stopLoading = useCallback(() => {
    setLoading(false);
    onLoadingChange?.(false);
  }, [onLoadingChange]);

  const deleteCookie = useCallback((name: string, path = '/') => {
    if (typeof document === 'undefined') return;

    document.cookie = `${name}=; Max-Age=0; path=${path};`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path};`;
  }, []);

  const decodeJwtResponse = useCallback((token: string): GooglePayload => {
    if (!token) {
      throw new Error('Google token is empty');
    }

    const tokenParts = token.split('.');

    if (tokenParts.length < 2) {
      throw new Error('Invalid Google JWT token');
    }

    const base64Url = tokenParts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => {
          return `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`;
        })
        .join('')
    );

    return JSON.parse(jsonPayload);
  }, []);

  const handleGoogleResponse = useCallback(
    async (response: GoogleCredentialResponse) => {
      try {
        if (!response?.credential) {
          throw new Error('Google credential not received');
        }

        const payload = decodeJwtResponse(response.credential);

        if (payload.email_verified === true) {
          await onSuccess?.(payload, response.credential);
        } else {
          throw new Error('Google email is not verified');
        }
      } catch (error) {
        onError?.(error);
      } finally {
        stopLoading();
      }
    },
    [decodeJwtResponse, onSuccess, onError, stopLoading]
  );

  const initGoogleSignIn = useCallback(() => {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      if (!clientId) {
        throw new Error('Google Client ID is missing');
      }

      if (!window.google?.accounts?.id) {
        throw new Error('Google Identity Services script is not loaded');
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        context: 'use',
        use_fedcm_for_prompt: true,
        callback: handleGoogleResponse,
        cancel_on_tap_outside: false,
        prompt_parent_id: promptParentId,
        auto_select: false,
        itp_support: true,
      });

      return true;
    } catch (error) {
      onError?.(error);
      return false;
    }
  }, [clientId, handleGoogleResponse, onError, promptParentId]);

  const buildFallbackUrl = useCallback(() => {
    if (!fallbackRedirectUrl) {
      return '';
    }

    const separator = fallbackRedirectUrl.includes('?') ? '&' : '?';

    return `${fallbackRedirectUrl}${separator}clientcode=${
      fallbackClientCode || ''
    }`;
  }, [fallbackRedirectUrl, fallbackClientCode]);

  const redirectToFallbackGoogleAuth = useCallback(() => {
    if (typeof window === 'undefined') {
      stopLoading();
      return;
    }

    const finalUrl = buildFallbackUrl();

    if (!finalUrl) {
      stopLoading();
      onError?.(new Error('Fallback redirect URL is missing'));
      return;
    }

    onFallbackRedirect?.(finalUrl);

    window.location.href = finalUrl;
  }, [buildFallbackUrl, onFallbackRedirect, onError, stopLoading]);

  const signInWithGoogle = useCallback(() => {
    startLoading();

    try {
      if (typeof window === 'undefined') {
        stopLoading();
        return;
      }

      if (!window.google?.accounts?.id) {
        throw new Error('Google Identity Services script is not available');
      }

      window.google.accounts.id.cancel();

      deleteCookie('g_state', '/');
      deleteCookie('g_state', '//');

      const previousGoogleError =
        sessionStorage.getItem(googleErrorSessionKey) || '';

      /**
       * Your required flow:
       * If FedCM/One Tap failed earlier, next click redirects to ASPX.
       */
      if (previousGoogleError) {
        redirectToFallbackGoogleAuth();
        return;
      }

      const initialized = initGoogleSignIn();

      if (!initialized || !window.google?.accounts?.id) {
        stopLoading();
        return;
      }

      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          let reason = 'Unknown reason';
          let type: GooglePromptBlockedData['type'] = 'unknown';

          if (notification.isNotDisplayed()) {
            type = 'not_displayed';
            reason =
              notification.getNotDisplayedReason?.() ||
              'Prompt Not Displayed';
          } else if (notification.isSkippedMoment()) {
            type = 'skipped';
            reason =
              notification.getSkippedMomentReason?.() ||
              'Prompt Skipped';
          }

          sessionStorage.setItem(googleErrorSessionKey, reason);

          onPromptBlocked?.({
            type,
            reason,
          });

          stopLoading();
        }
      });

      /**
       * Important:
       * FedCM may not always return prompt moment callbacks.
       * This ensures spinner never gets stuck.
       */
      setTimeout(() => {
        stopLoading();
      }, 2500);
    } catch (error) {
      stopLoading();
      onError?.(error);
    }
  }, [
    startLoading,
    stopLoading,
    deleteCookie,
    googleErrorSessionKey,
    initGoogleSignIn,
    onError,
    onPromptBlocked,
    redirectToFallbackGoogleAuth,
  ]);

  const clearGoogleError = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(googleErrorSessionKey);
  }, [googleErrorSessionKey]);

  return {
    loading,
    signInWithGoogle,
    initGoogleSignIn,
    decodeJwtResponse,
    clearGoogleError,
  };
}