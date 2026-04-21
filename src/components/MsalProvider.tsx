"use client";

import { MsalProvider as MSProvider } from "@azure/msal-react";
import { msalInstance } from "@/lib/msal";
import { useEffect, useState } from "react";

export function MsalProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Only initialize — let @azure/msal-react handle handleRedirectPromise internally
    msalInstance.initialize()
      .then(() => setReady(true))
      .catch(() => setReady(true)); // still render even if init fails
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return <MSProvider instance={msalInstance}>{children}</MSProvider>;
}
