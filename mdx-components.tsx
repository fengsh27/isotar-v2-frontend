import type { MDXComponents } from "mdx/types";
import Link from "next/link";

// Element styles for the docs pages (app/docs/**/page.mdx). @next/mdx requires
// this file at the project root; keeping the styling here lets the pages stay
// plain Markdown.
const components: MDXComponents = {
  h1: (props) => <h1 className="text-2xl font-semibold text-zinc-900" {...props} />,
  h2: (props) => (
    <h2 className="mt-8 scroll-mt-24 text-lg font-semibold text-teal-800" {...props} />
  ),
  h3: (props) => <h3 className="mt-6 font-semibold text-zinc-900" {...props} />,
  p: (props) => <p className="mt-3 text-sm leading-relaxed text-zinc-700" {...props} />,
  ul: (props) => (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700" {...props} />
  ),
  ol: (props) => (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700" {...props} />
  ),
  strong: (props) => <strong className="font-semibold text-zinc-900" {...props} />,
  a: ({ href = "", ...props }) =>
    href.startsWith("/") || href.startsWith("#") ? (
      <Link
        href={href}
        className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900"
        {...props}
      />
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900"
        {...props}
      />
    ),
  code: (props) => (
    <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800" {...props} />
  ),
  pre: (props) => (
    <pre
      className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-800 [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  table: (props) => (
    <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200">
      <table className="w-full text-left text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-teal-50/70 text-zinc-700" {...props} />,
  th: (props) => <th className="px-3 py-2 font-semibold" {...props} />,
  td: (props) => <td className="border-t border-zinc-100 px-3 py-2 align-top text-zinc-700" {...props} />,
  hr: () => <hr className="my-8 border-zinc-200" />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
