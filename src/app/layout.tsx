import type { Metadata, Viewport } from "next";
import { Nunito, Baloo_2 } from "next/font/google";
import "./globals.css";

// Nov 2026 adventure-world look: rounded, friendly faces. Headings use font-display.
const nunito = Nunito({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const baloo = Baloo_2({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "PlayWise",
  description: "Educational Gaming Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PlayWise",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/playwise-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f9e6e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { MsalProvider } from "@/components/MsalProvider";
import { SWUpdater } from "@/components/SWUpdater";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${baloo.variable} font-sans`}>
        <SWUpdater />
        <MsalProvider>
          {children}
        </MsalProvider>
      </body>
    </html>
  );
}