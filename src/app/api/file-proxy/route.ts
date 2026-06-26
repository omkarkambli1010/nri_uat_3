import { NextRequest, NextResponse } from 'next/server';

// Same-origin proxy for presigned S3 document URLs. The browser can't fetch the
// S3 object directly (the bucket sends no Access-Control-Allow-Origin header),
// so we fetch it server-side — where CORS doesn't apply — and stream it back.
// Used to seed previously-uploaded proof documents into the upload cards.

export const dynamic = 'force-dynamic';

// ── SSRF guard ───────────────────────────────────────────────────────────────
// Only proxy objects from our own onboarding bucket(s). Presigned URLs are
// path-style (s3.<region>.amazonaws.com/<bucket>/<key>) but virtual-hosted
// (<bucket>.s3.<region>.amazonaws.com/<key>) is accepted too. The bucket name
// must match our naming (nrionboarding-<env>.sbicapsec.com) so this endpoint
// can't be turned into an open proxy / SSRF tool against arbitrary hosts.
const S3_PATH_HOST_RE = /^s3(\.[a-z0-9-]+)?\.amazonaws\.com$/i;
const S3_VHOST_SUFFIX_RE = /\.s3(\.[a-z0-9-]+)?\.amazonaws\.com$/i;
const BUCKET_RE = /^nrionboarding-[a-z0-9.-]+\.sbicapsec\.com$/i;

function allowedBucketUrl(parsed: URL): boolean {
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();

  // Path-style: bucket is the first path segment.
  if (S3_PATH_HOST_RE.test(host)) {
    const bucket = parsed.pathname.replace(/^\/+/, '').split('/')[0];
    return BUCKET_RE.test(bucket);
  }

  // Virtual-hosted: bucket is the host prefix before the S3 suffix.
  const match = host.match(S3_VHOST_SUFFIX_RE);
  if (match) {
    const bucket = host.slice(0, host.length - match[0].length);
    return BUCKET_RE.test(bucket);
  }

  return false;
}

// ── Content-Type lockdown ────────────────────────────────────────────────────
// Never echo the upstream Content-Type verbatim (an HTML object would render in
// our origin → XSS). Only serve known document/image types; reject anything else.
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!allowedBucketUrl(parsed)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: 'Upstream fetch failed' },
        { status: 502 },
      );
    }

    const upstreamType = (upstream.headers.get('content-type') ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();

    if (!ALLOWED_CONTENT_TYPES.has(upstreamType)) {
      return NextResponse.json(
        { error: 'Unsupported content type' },
        { status: 415 },
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        // Forced safe type (not the raw upstream header).
        'Content-Type': upstreamType,
        // Defense-in-depth: never render in our origin, never sniff, sandbox.
        'Content-Disposition': 'attachment',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'",
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
