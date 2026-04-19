import { PublicClientApplication, Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || "00000000-0000-0000-0000-000000000000",
        authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID || "common"}`,
        redirectUri: "/",
        postLogoutRedirectUri: "/",
        navigateToLoginRequestUrl: false,
    },
    cache: {
        cacheLocation: "localStorage", // This ensures the login persists across app restarts
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error: console.error(message); return;
                    case LogLevel.Info: console.info(message); return;
                    case LogLevel.Verbose: console.debug(message); return;
                    case LogLevel.Warning: console.warn(message); return;
                }
            }
        }
    }
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
    scopes: ["User.Read"]
};