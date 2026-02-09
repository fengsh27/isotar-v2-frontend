export default function CitationPage() {
  return (
    <section className="surface-panel-strong rounded-2xl p-6 fade-rise">
      <h1 className="text-2xl font-semibold text-zinc-900">Citation Details</h1>
      <p className="mt-3 text-sm text-zinc-700">
        Please cite isoTar using the following reference:
      </p>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white/85 p-4 text-sm text-zinc-800">
        Distefano R. et al. <em>isoTar: Consensus Target Prediction with Enrichment Analysis for
        MicroRNAs Harboring Editing Sites and Other Variations</em>, Methods in Molecular Biology,
        2019.
      </div>

      <p className="mt-4 text-sm text-zinc-700">
        PubMed: <a className="text-teal-700 underline" href="https://pubmed.ncbi.nlm.nih.gov/30874918/" target="_blank" rel="noopener noreferrer">https://pubmed.ncbi.nlm.nih.gov/30874918/</a>
      </p>
    </section>
  );
}
