import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "800"] });

export const metadata: Metadata = {
  title: "TripSync: plan the group trip in one link",
  description: "Everyone submits once. You get three trip options that work for the whole group.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f7a63" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${bricolage.variable} font-sans antialiased`}>
        <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-5">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-xl bg-accent text-white">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M3 18l6-10 4 6 2-3 6 7z" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              Trip<span className="text-accent">Sync</span>
            </span>
          </Link>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-6 pb-20">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 text-center text-xs text-muted">
          One link, everyone&apos;s preferences, one decision. Costs shown are rough estimates.
        </footer>
      </body>
    </html>
  );
}
