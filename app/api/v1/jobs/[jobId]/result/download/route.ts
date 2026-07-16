import * as http from "node:http";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";

// Server-side only — never sent to the browser.
const API_BASE_URL = (() => {
  const raw = process.env.API_BASE ?? "http://127.0.0.1:5001";
  return new URL(raw.replace(/\/$/, ""));
})();

// 15 minutes — matches the backend gunicorn/nginx 900s ceiling.
//
// The default rewrite proxy caps the upstream call at 30s. The backend builds
// result.zip lazily on the first download, which for a multi-GB job takes
// minutes (a 1.6GB mir-network job measured ~52s), so that first request died
// at 30s with a 500 while the build kept running server-side. As with the
// enrichment route, we use node:http directly (not fetch/undici) so this
// timeout is the only knob controlling the upstream call.
const DOWNLOAD_TIMEOUT_MS = 900_000;

// The zip is far too large to buffer (191MB for the job that surfaced this),
// so the upstream response is streamed straight through to the browser rather
// than read into memory. Buffering would also corrupt it: the enrichment route
// decodes bodies as UTF-8, which is lossy for binary.
export const dynamic = "force-dynamic";

/** Headers worth preserving so the browser saves a correct, sized file. */
const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-disposition",
  "last-modified",
  "etag",
];

function callUpstream(
  path: string,
  signal: AbortSignal,
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        protocol: API_BASE_URL.protocol,
        hostname: API_BASE_URL.hostname,
        port: API_BASE_URL.port || 80,
        path,
        method: "GET",
        headers: { Accept: "application/zip, application/json" },
        timeout: DOWNLOAD_TIMEOUT_MS,
      },
      resolve,
    );

    // The browser navigated away or cancelled the save — stop the transfer
    // instead of streaming the rest of a multi-GB file into a dead socket.
    signal.addEventListener("abort", () => req.destroy(), { once: true });

    req.on("timeout", () => {
      req.destroy(new Error(`upstream timed out after ${DOWNLOAD_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.end();
  });
}

/** Read a small non-200 upstream body (a JSON error) so we can pass it on. */
async function readBody(res: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of res) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const path = `/api/v1/jobs/${encodeURIComponent(jobId)}/result/download`;
  const started = Date.now();

  console.log(`[download-route] GET ${path} forwarded`);

  let upstream: http.IncomingMessage;
  try {
    upstream = await callUpstream(path, request.signal);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `[download-route] GET ${path} upstream error elapsed=${Date.now() - started}ms detail=${detail}`,
    );
    return NextResponse.json(
      { error: "result download upstream request failed", detail },
      { status: 504 },
    );
  }

  const status = upstream.statusCode ?? 0;
  console.log(
    `[download-route] GET ${path} upstream status=${status} elapsed=${Date.now() - started}ms`,
  );

  // Backend refused (404 job not found / 409 not completed / 500 build failed).
  // These bodies are small JSON, so forward them verbatim.
  if (status !== 200) {
    const body = await readBody(upstream);
    return new NextResponse(body, {
      status,
      headers: {
        "Content-Type": upstream.headers["content-type"] ?? "application/json",
      },
    });
  }

  const headers = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }

  const body = Readable.toWeb(upstream) as ReadableStream<Uint8Array>;
  return new NextResponse(body, { status: 200, headers });
}
