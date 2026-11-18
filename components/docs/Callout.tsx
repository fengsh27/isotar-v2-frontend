import type { ReactNode } from "react";

const TONES = {
  note: "border-teal-200 bg-teal-50/70 text-teal-900",
  warning: "border-amber-200 bg-amber-50/80 text-amber-900",
} as const;

/** A highlighted box in a docs page, e.g. a rule people commonly trip over. */
export function Callout({
  tone = "note",
  title,
  children,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${TONES[tone]}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className="[&>p:first-child]:mt-0 [&_p]:text-inherit [&_li]:text-inherit">{children}</div>
    </div>
  );
}
