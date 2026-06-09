import type { NextConfig } from "next";

import pkg from "./package.json";

// Server-side only — never sent to the browser.
const apiBase = process.env.API_BASE?.replace(/\/$/, "") ?? "http://127.0.0.1:5001";

const nextConfig: NextConfig = {
  output: "standalone",
  // Expose the package.json version to the app (server + browser) at build time
  // so the UI can display which build is running. Kept in sync with the Docker
  // image tag by `npm run release`.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  async rewrites() {
    return [
      {
        // Match anything under /api/v1/ EXCEPT exactly
        // /api/v1/jobs/<id>/enrichment — that path is handled locally by
        // app/api/v1/jobs/[jobId]/enrichment/route.ts so we can control the
        // upstream timeout. Subpaths (e.g. .../enrichment/dotplot) still
        // rewrite through to the backend as normal.
        // In Next.js, afterFiles rewrites run BEFORE dynamic routes, so a
        // plain /api/v1/:path* would always preempt the Route Handler.
        source: "/api/v1/:path((?!jobs/[^/]+/enrichment$).+)",
        destination: `${apiBase}/api/v1/:path`,
      },
      {
        source: "/mirna/:path*",
        destination: `${apiBase}/mirna/:path*`,
      },
    ];
  },
};

export default nextConfig;
