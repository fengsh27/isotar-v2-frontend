import type { Metadata } from "next";
import Link from "next/link";

import { Providers } from "@/app/providers";
import { getApiBase } from "@/lib/api";

import "./globals.css";

export const metadata: Metadata = {
  title: "isotar",
  description: "miRNA-centered target prediction and enrichment analysis",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiBase = getApiBase();

  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="min-h-screen">
            <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/85 backdrop-blur">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3">
                <Link href="/" className="text-xl font-semibold tracking-tight text-zinc-900">
                  isotar
                </Link>
                <nav className="flex items-center gap-4 text-sm text-zinc-700">
                  <Link href="/run" className="transition-colors hover:text-teal-700">
                    Run Analysis
                  </Link>
                  <Link href="/jobs" className="transition-colors hover:text-teal-700">
                    Jobs
                  </Link>
                  <Link href="/docs" className="transition-colors hover:text-teal-700">
                    Docs
                  </Link>
                  <Link href="/about" className="transition-colors hover:text-teal-700">
                    About
                  </Link>
                </nav>
              </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-5 py-6">{children}</main>

            <footer className="mx-auto mt-10 w-full max-w-6xl border-t border-zinc-200/70 px-5 py-4 text-xs text-zinc-500">
              Frontend (stateless) → API → Job → Results
              <span className="ml-2">{apiBase ? `API: ${apiBase}` : "API: same-origin"}</span>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
