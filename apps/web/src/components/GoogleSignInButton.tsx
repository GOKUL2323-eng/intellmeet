import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { AlertCircle } from 'lucide-react';

interface Props {
  onSuccess?: () => void;
  onError?: (err: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

declare global {
  interface Window {
    google?: any;
  }
}

export const GoogleSignInButton: React.FC<Props> = ({
  onSuccess,
  onError,
  text = 'continue_with'
}) => {
  const { loginWithGoogle } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [googleClientReady, setGoogleClientReady] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!clientId) return;

    // Load Google Identity Services script if not already present
    const scriptId = 'google-gsi-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const handleScriptLoad = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse
          });
          setGoogleClientReady(true);
        } catch (e) {
          console.warn('Google GSI initialization error:', e);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = handleScriptLoad;
      document.body.appendChild(script);
    } else if (window.google?.accounts?.id) {
      handleScriptLoad();
    }
  }, [clientId]);

  const handleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      onError?.('No credential returned from Google');
      return;
    }

    try {
      setIsLoading(true);
      await loginWithGoogle(response.credential);
      onSuccess?.();
    } catch (err: any) {
      onError?.(err.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoGoogleAuth = async (demoSub: string, name: string) => {
    try {
      setIsLoading(true);
      // In development/test mode, our backend supports deterministic test Google tokens
      const mockCredential = `test-google-token-${demoSub}`;
      await loginWithGoogle(mockCredential);
      onSuccess?.();
    } catch (err: any) {
      onError?.(err.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* If Google Client ID is configured and GIS is loaded, render the official GSI button */}
      {clientId && googleClientReady && (
        <div ref={buttonContainerRef} className="w-full flex justify-center mb-3 min-h-[44px]" />
      )}

      {/* Styled Google Button (Works with native GSI trigger or instant demo OAuth) */}
      <button
        type="button"
        disabled={isLoading}
        onClick={() => {
          if (clientId && window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
          } else {
            handleDemoGoogleAuth('alex-chen', 'Alex Chen');
          }
        }}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-white/10 hover:border-white/20 text-slate-200 text-xs font-semibold flex items-center justify-center gap-3 transition shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50"
      >
        {/* Official Google G Logo SVG */}
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.87c2.27-2.09 3.675-5.17 3.675-9.14z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.04c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.13C3.26 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.25c-.25-.72-.38-1.49-.38-2.25s.13-1.53.38-2.25V6.62H1.28A11.968 11.968 0 0 0 0 12c0 1.92.45 3.74 1.28 5.38l3.99-3.13z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.62l3.99 3.13c.95-2.85 3.6-4.96 6.73-4.96z"
          />
        </svg>
        <span>
          {isLoading
            ? 'Authenticating with Google...'
            : text === 'signup_with'
            ? 'Sign up with Google'
            : text === 'signin_with'
            ? 'Sign in with Google'
            : 'Continue with Google'}
        </span>
      </button>
    </div>
  );
};
