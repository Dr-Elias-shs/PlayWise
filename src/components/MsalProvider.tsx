"use client";

import { MsalProvider as MSProvider } from "@azure/msal-react";
import { msalInstance } from "@/lib/msal";
import { useEffect, useState } from "react";

export function MsalProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        // Handle any redirect results (even for popups, this helps sync state)
        await msalInstance.handleRedirectPromise();
        setIsInitialized(true);
      } catch (error) {
        console.error("MSAL Initialization Error:", error);
      }
    };
    initializeMsal();
  }, []);

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return <MSProvider instance={msalInstance}>{children}</MSProvider>;
}
