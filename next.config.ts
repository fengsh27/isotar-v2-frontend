import type { NextConfig } from "next";

// Server-side only — never sent to the browser.
const apiBase = process.env.API_BASE?.replace(/\/$/, "") ?? "http://127.0.0.1:5001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/api/v1/:path*`,
      },
      {
        source: "/mirna/:path*",
        destination: `${apiBase}/mirna/:path*`,
      },
    ];
  },
};

export default nextConfig;
