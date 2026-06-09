// Dev-time same-origin proxy for the NRI backend.
//
// The browser calls these endpoints under the app's own origin (/nriapi/...),
// so there is no CORS preflight. The request below runs on the Next server, so
// it is server-to-server (no CORS) and follows any 307 the backend issues,
// returning the final JSON to the browser.
//
// We use axios with `insecureHTTPParser: true` because the NRI backend returns
// a slightly non-compliant HTTP/1.1 response that Node's strict `fetch`
// (undici) rejects with HPE_INVALID_HEADER_TOKEN. The lenient parser tolerates
// it the way browsers do.
//
// In production the app talks to the backend directly (see api.service.ts), so
// this handler is only exercised in development.

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const NRI_BASE = 'https://udn.sbisecurities.in/nriapi';

// Headers we forward upstream. We deliberately drop hop-by-hop / origin headers
// (host, origin, referer, …) so the upstream sees a clean server request.
const FORWARD_HEADERS = ['content-type', 'idempotency-key', 'authorization'];

async function proxy(req: NextRequest, path: string[]) {
  const target = `${NRI_BASE}/${path.join('/')}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  // Use arrayBuffer() instead of text() to preserve binary file bytes
  // (text() corrupts multipart PNG/JPEG data causing magic byte mismatch)
  const data = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

  const res = await axios.request({
    url: target,
    method: req.method,
    headers,
    data,
    responseType: 'arraybuffer',         // keep response binary-safe
    insecureHTTPParser: true,            // tolerate backend's non-compliant response
    maxRedirects: 5,                     // follow 307 server-side (POST + body preserved)
    validateStatus: () => true,          // pass non-2xx straight through, don't throw
    transformResponse: [(d) => d],       // keep raw bytes as-is
  });

  const contentType: string = res.headers['content-type'] ?? 'application/json';

  // Convert to Uint8Array — NextResponse accepts BodyInit which includes
  // Uint8Array but not Buffer<ArrayBufferLike> directly in newer Next.js types
  const responseBody = new Uint8Array(res.data as ArrayBuffer);

  return new NextResponse(responseBody, {
    status: res.status as number,
    headers: { 'content-type': contentType },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { path } = await params;
  return proxy(req, path);
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { path } = await params;
  return proxy(req, path);
}
 