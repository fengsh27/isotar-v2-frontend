import type { ReactNode } from "react";

import { DocsNav } from "@/components/docs/DocsNav";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="md:sticky md:top-6 md:self-start">
        <DocsNav />
      </aside>
      <article className="surface-panel-strong min-w-0 rounded-2xl p-6 fade-rise md:p-8">
        {children}
      </article>
    </div>
  );
}
