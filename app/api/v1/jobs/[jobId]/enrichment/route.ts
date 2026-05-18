import * as http from "node:http";
import { NextRequest, NextResponse } from "next/server";

// Server-side only — never sent to the browser.
const API_BASE_URL = (() => {
  const raw = process.env.API_BASE ?? "http://127.0.0.1:5001";
  return new URL(raw.replace(/\/$/, ""));
})();

// 15 minutes — matches the backend gunicorn/nginx 900s ceiling.
// We use node:http directly (not fetch/undici) so the timeout knob is the only
// one that controls the upstream call — no hidden undici headersTimeout.
const ENRICHMENT_TIMEOUT_MS = 900_000;

interface UpstreamResult {
  status: number;
  body: string;
  contentType: string | null;
}

function callUpstream(
  method: string,
  path: string,
  body: string | null,
): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = body
      ? {
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(body)),
        }
      : { Accept: "application/json" };

    const req = http.request(
      {
        protocol: API_BASE_URL.protocol,
        hostname: API_BASE_URL.hostname,
        port: API_BASE_URL.port || 80,
        path,
        method,
        headers,
        timeout: ENRICHMENT_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf-8"),
            contentType: res.headers["content-type"] ?? null,
          });
        });
        res.on("error", reject);
      },
    );

    req.on("timeout", () => {
      req.destroy(
        new Error(`upstream timed out after ${ENRICHMENT_TIMEOUT_MS}ms`),
      );
    });

    req.on("error", reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function proxy(
  request: NextRequest,
  jobId: string,
): Promise<NextResponse> {
  const path = `/api/v1/jobs/${encodeURIComponent(jobId)}/enrichment`;
  let body: string | null = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  const started = Date.now();
  console.log(
    `[enrichment-route] ${request.method} ${path} forwarded` +
      (body ? ` (body ${body.length} bytes)` : ""),
  );

  try {
    const result = await callUpstream(request.method, path, body);
    console.log(
      `[enrichment-route] ${request.method} ${path} upstream status=${result.status} elapsed=${Date.now() - started}ms`,
    );
    return new NextResponse(result.body, {
      status: result.status,
      headers: { "Content-Type": result.contentType ?? "application/json" },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `[enrichment-route] ${request.method} ${path} upstream error elapsed=${Date.now() - started}ms detail=${detail}`,
    );
    return NextResponse.json(
      { error: "enrichment upstream request failed", detail },
      { status: 504 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  return proxy(request, jobId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  return proxy(request, jobId);
}
