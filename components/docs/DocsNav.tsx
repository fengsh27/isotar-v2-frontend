"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const DOCS_PAGES = [
  { href: "/docs", label: "Getting started" },
  { href: "/docs/mir-network", label: "miR-Network Visualization" },
  { href: "/docs/faq", label: "FAQ & troubleshooting" },
  { href: "/docs/citation", label: "Citation" },
] as const;

export function DocsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="surface-panel rounded-2xl p-3 text-sm">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Docs</p>
      <ul className="space-y-0.5">
        {DOCS_PAGES.map((page) => {
          const active = pathname === page.href;
          return (
            <li key={page.href}>
              <Link
                href={page.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-2 py-1.5 transition-colors ${
                  active
                    ? "bg-white font-semibold text-teal-700 shadow-sm"
                    : "text-zinc-700 hover:bg-teal-50 hover:text-teal-700"
                }`}
              >
                {page.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
