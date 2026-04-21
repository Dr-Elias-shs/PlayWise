import { PublicClientApplication, Configuration, LogLevel } from "@azure/msal-browser";

const isDev = process.env.NODE_ENV === "development";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID}`,
    redirectUri: typeof window !== "undefined"
      ? `${window.location.origin}/blank.html`
      : isDev ? "http://localhost:3000/blank.html" : "https://playwise-8b6o.onrender.com/blank.html",
    postLogoutRedirectUri: typeof window !== "undefined"
      ? window.location.origin
      : isDev ? "http://localhost:3000" : "https://playwise-8b6o.onrender.com",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true, // keeps PKCE state across redirect in Safari/private mode
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
    },
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ["User.Read"],
};