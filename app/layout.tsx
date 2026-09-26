import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TripSync: plan the group trip in one link",
  description: "Everyone submits once. You get three trip options that work for the whole group.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f8a6c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`}>
        <header className="mx-auto flex max-w-3xl items-center px-4 pt-5">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Trip<span className="text-accent">Sync</span>
          </Link>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-16">{children}</main>
      </body>
    </html>
  );
}
