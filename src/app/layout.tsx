import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PlayWise",
  description: "Educational Gaming Platform",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/playwise-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};

import { MsalProvider } from "@/components/MsalProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MsalProvider>
          {children}
        </MsalProvider>
      </body>
    </html>
  );
}