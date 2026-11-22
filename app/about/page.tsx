import Link from "next/link";

const LINKS = [
  {
    label: "Backend source (prediction tools and REST API)",
    href: "https://github.com/fengsh27/isoTar-v2",
    text: "github.com/fengsh27/isoTar-v2",
  },
  {
    label: "Web interface source",
    href: "https://github.com/fengsh27/isotar-v2-frontend",
    text: "github.com/fengsh27/isotar-v2-frontend",
  },
  {
    label: "Backend Docker image",
    href: "https://hub.docker.com/r/frankfeng78/isotar-v2",
    text: "hub.docker.com/r/frankfeng78/isotar-v2",
  },
  {
    label: "Web interface Docker image",
    href: "https://hub.docker.com/r/frankfeng78/isotar-v2-frontend",
    text: "hub.docker.com/r/frankfeng78/isotar-v2-frontend",
  },
] as const;

export default function AboutPage() {
  return (
    <section className="surface-panel-strong rounded-2xl p-6 fade-rise">
      <h1 className="text-2xl font-semibold text-zinc-900">About isotar</h1>
      <p className="mt-2 text-sm text-zinc-700">
        isotar is a web platform for miRNA-centered target prediction and downstream enrichment
        analysis with asynchronous, manifest-backed jobs.
      </p>
      <p className="mt-3 text-sm text-zinc-700">
        isoTar is open source and published as Docker images, so a lab can run the same tool on
        its own server with more CPU per job and without sending data anywhere. See{" "}
        <Link href="/docs/deployment" className="text-teal-700 underline">
          Run isoTar locally
        </Link>
        .
      </p>

      <h2 className="mt-6 text-base font-semibold text-zinc-900">Source code and images</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-zinc-700">
        {LINKS.map((link) => (
          <li key={link.href}>
            <span>{link.label}: </span>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 underline break-all"
            >
              {link.text}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
