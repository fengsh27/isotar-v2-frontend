import type { Metadata } from "next";
import Link from "next/link";

import { MainNav } from "@/components/layout/MainNav";
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
                <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-zinc-900">
                  <span className="inline-block h-3 w-3 rounded-full bg-teal-600" />
                  isoTar
                </Link>
                <MainNav />
              </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-5 pb-8 pt-3">{children}</main>

            <footer className="mx-auto mt-8 w-full max-w-6xl px-5 pb-6 text-center text-xs text-zinc-400">
              isoTar v{process.env.NEXT_PUBLIC_APP_VERSION}
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
