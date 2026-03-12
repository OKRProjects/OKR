import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Chatbot from "@/components/Chatbot";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
