import type { Metadata } from "next";
import Link from "next/link";

import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "isoTar",
  description: "miRNA-centered target prediction and enrichment analysis",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="min-h-screen">
            <header className="sticky top-0 z-20 border-b border-zinc-300/80 bg-[#f4f8f2] px-4 py-3 shadow-sm">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-1">
                <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-600" />
                  isoTar
                </Link>
                <nav className="flex items-center gap-1 rounded-xl border border-zinc-300 bg-[#e6eee2] p-1 text-sm text-zinc-700">
                  <Link href="/run" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-teal-50 hover:text-teal-700">
                    Run Analysis
                  </Link>
                  <Link href="/jobs" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-teal-50 hover:text-teal-700">
                    Jobs
                  </Link>
                  <Link href="/docs" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-teal-50 hover:text-teal-700">
                    Docs
                  </Link>
                  <Link href="/about" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-teal-50 hover:text-teal-700">
                    About
                  </Link>
                </nav>
              </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-5 pb-8 pt-3">{children}</main>

            <footer className="mx-auto mt-8 w-full max-w-6xl px-5 pb-6" />
          </div>
        </Providers>
      </body>
    </html>
  );
}
