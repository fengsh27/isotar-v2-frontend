"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LINK_BASE = "rounded-lg px-3.5 py-2 transition-colors";
const LINK_IDLE = "hover:bg-teal-50 hover:text-teal-700";
const LINK_ACTIVE = "bg-white font-semibold text-teal-700 shadow-sm";

// No `new=1` on the two /run links: switching workflows from the nav keeps the
// wizard inputs entered so far. The landing-page CTAs still pass it, so
// "Run isoTar analysis" starts a clean run.
const NAV_ITEMS = [
  { href: "/run?workflow=mir-target", label: "miR-Target Prediction", workflow: "mir-target" },
  { href: "/run?workflow=mir-lncrna", label: "miR-LncRNA Prediction", workflow: "mir-lncrna" },
  { href: "/network", label: "miR-Network Visualization" },
  { href: "/jobs", label: "Jobs" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
] as const;

function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Both single-miRNA workflows live on /run and differ only by query string,
  // so the active one is decided by `?workflow=`. Mirror RunPageClient's
  // fallback: anything other than "mir-target" resolves to mir-lncrna.
  const runWorkflow =
    searchParams.get("workflow") === "mir-target" ? "mir-target" : "mir-lncrna";

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if ("workflow" in item) {
      return pathname === "/run" && runWorkflow === item.workflow;
    }
    // /jobs also owns /jobs/[id]; the rest are single pages.
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${LINK_BASE} ${active ? LINK_ACTIVE : LINK_IDLE}`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function MainNav() {
  return (
    <nav className="flex items-center gap-1 rounded-xl border border-zinc-300 bg-[#e6eee2] p-1 text-base font-medium text-zinc-700">
      {/* useSearchParams needs a Suspense boundary; the fallback keeps the bar
          the same size so the header does not jump on first paint. */}
      <Suspense fallback={<span className="px-3.5 py-2 opacity-0">isoTar</span>}>
        <NavLinks />
      </Suspense>
    </nav>
  );
}
