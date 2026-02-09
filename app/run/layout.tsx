export default function RunLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold text-zinc-900">Run Analysis</h1>
        <p className="mt-1 text-sm text-zinc-700">
          Workflow: miRNA → operation → prediction tools → species → configuration → job →
          results.
        </p>
      </header>
      {children}
    </section>
  );
}
