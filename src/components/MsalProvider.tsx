"use client";

import { MsalProvider as MSProvider } from "@azure/msal-react";
import { msalInstance } from "@/lib/msal";
import { useEffect, useState } from "react";

const ALLOWED_DOMAIN = 'sagesssehs.edu.lb';

export function MsalProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await msalInstance.initialize();
        // Handle redirect result — fires after loginRedirect returns to the app
        const result = await msalInstance.handleRedirectPromise();

        if (result?.account) {
          const email = result.account.username ?? '';
          if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
            // Wrong domain — log them out immediately
            await msalInstance.logoutRedirect({
              account: result.account,
              postLogoutRedirectUri: window.location.origin,
            });
            return;
          }
          // Valid domain — set as active account
          msalInstance.setActiveAccount(result.account);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("MSAL init error:", error);
        setIsInitialized(true); // Still render so the login screen shows
      }
    };
    init();
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-brand-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return <MSProvider instance={msalInstance}>{children}</MSProvider>;
}
