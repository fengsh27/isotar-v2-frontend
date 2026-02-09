import type { Metadata } from "next";
import Link from "next/link";

import { Providers } from "@/app/providers";
import { getApiBase } from "@/lib/api";

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
  const apiBase = getApiBase();

  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="min-h-screen">
            <header className="sticky top-0 z-20 px-4 py-4">
              <div className="surface-panel mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl px-5 py-3">
                <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-600" />
                  isoTar
                </Link>
                <nav className="flex items-center gap-1 rounded-xl border border-zinc-200/70 bg-white/70 p-1 text-sm text-zinc-700">
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

            <footer className="mx-auto mt-8 w-full max-w-6xl px-5 pb-6">
              <div className="surface-panel rounded-2xl px-4 py-3 text-xs text-zinc-600">
                Frontend (stateless) → API → Job → Results
                <span className="ml-2">{apiBase ? `API: ${apiBase}` : "API: same-origin"}</span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
