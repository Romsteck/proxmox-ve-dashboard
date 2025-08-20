import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ToastProvider from "@/components/ui/Toast";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectionProvider } from "@/lib/contexts/ConnectionContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proxmox VE Dashboard",
  description: "Modern dashboard for monitoring Proxmox VE infrastructure",
  keywords: ["proxmox", "dashboard", "monitoring", "virtualization"],
  authors: [{ name: "Proxmox Dashboard Team" }],
  viewport: "width=device-width, initial-scale=1",
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
        <PageErrorBoundary>
          <ConnectionProvider>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
              <Navigation />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
            <ToastProvider />
          </ConnectionProvider>
        </PageErrorBoundary>
      </body>
    </html>
  );
}
