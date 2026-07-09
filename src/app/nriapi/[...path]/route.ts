import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const S3_PATH_HOST_RE = /^s3(\.[a-z0-9-]+)?\.amazonaws\.com$/i;
const S3_VHOST_SUFFIX_RE = /\.s3(\.[a-z0-9-]+)?\.amazonaws\.com$/i;
const BUCKET_RE = /^nrionboarding-[a-z0-9.-]+\.sbicapsec\.com$/i;

function allowedBucketUrl(parsed: URL): boolean {
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();

  if (S3_PATH_HOST_RE.test(host)) {
    const bucket = parsed.pathname.replace(/^\/+/, '').split('/')[0];
    return BUCKET_RE.test(bucket);
  }

  const match = host.match(S3_VHOST_SUFFIX_RE);
  if (match) {
    const bucket = host.slice(0, host.length - match[0].length);
    return BUCKET_RE.test(bucket);
  }

  return false;
}

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
        'Content-Type': upstreamType,
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
