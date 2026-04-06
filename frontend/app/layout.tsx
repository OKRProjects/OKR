import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Chatbot from "@/components/Chatbot";
import { ThemePreference } from "@/components/ThemePreference";
import { ViewRoleProvider } from "@/lib/ViewRoleContext";
import { ViewPreferencesProvider } from "@/lib/useViewPreferences";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OKR Tracker",
  description: "Track organizational objectives and key results. Align strategic goals from leadership to execution.",
};

/** Ensure layout reads env at request time (Docker/Render set NEXT_PUBLIC_API_URL at runtime, not build). */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const backendOrigin = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__OKR_BACKEND_ORIGIN__=${JSON.stringify(backendOrigin)};`,
          }}
        />
        <ThemePreference />
        <ViewRoleProvider>
          <ViewPreferencesProvider>
            {children}
            <Toaster richColors position="top-right" />
            <Chatbot />
          </ViewPreferencesProvider>
        </ViewRoleProvider>
      </body>
    </html>
  );
}
