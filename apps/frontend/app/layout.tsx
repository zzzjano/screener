import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/src/styles/tokens.css";
import { pl } from "@/src/lib/i18n/pl";
import { AppQueryProvider } from "@/src/lib/query-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: pl.app.name,
  description: pl.app.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-[#0b0e11] text-[#eaecef]">
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}
