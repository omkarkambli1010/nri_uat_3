'use client';

import type { UploadedFile } from './fileUpload.types';
import { environment } from '@/environments/environment';

// Shared loader that turns a saved document's presigned S3 URL into a real File
// + preview, so it can be shown in the dropzone AND (where the flow re-submits
// saved proofs) sent again unchanged. Used by every "revisit shows previously
// uploaded documents" screen (foreign/permanent address, visa, passport, OCI,
// FATCA) so the fetch + guard + filename logic lives in exactly one place.

// The proxy only ever serves these whitelisted document/image types.
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'image/heic', 'image/heif', 'application/pdf',
]);

const KNOWN_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

// Derive the real document filename from the S3 object key's last path segment
// (query string stripped, percent-decoded) so the card shows the actual name
// the user uploaded — e.g. "Saleema PP Front Indian.png" — instead of a generic
// "proof-document.png". Returns the decoded segment plus its own extension when
// present, otherwise the segment + the derived ext, otherwise the fallback.
const deriveName = (
  segment: string,
  segExt: string,
  fallbackBase: string,
  ext: string,
): string => {
  if (!segment) return `${fallbackBase}.${ext}`;
  return KNOWN_EXT.has(segExt) ? segment : `${segment}.${ext}`;
};

/**
 * Fetch a saved document's presigned S3 URL into a real File + preview.
 *
 * S3 presigned URLs aren't CORS-enabled, so the object is fetched through the
 * same-origin `/api/file-proxy` route (basePath-aware). Returns `null` on any
 * failure — empty url, non-OK response, or a non-media body (an HTML error /
 * app-shell page served when the request never reached the proxy route, e.g. a
 * basePath / reverse-proxy mismatch) — so a bogus ".html" file is never seeded.
 * Dev builds log a warning explaining exactly why the preview stayed empty.
 *
 * @param url             the presigned S3 URL from the saved stage's documents[]
 * @param fallbackBaseName base name to use only when the S3 key has no usable
 *                         filename (e.g. "passport-document")
 */
export const buildInitialFileFromUrl = async (
  url: string,
  fallbackBaseName = 'document',
): Promise<UploadedFile | null> => {
  if (!url) return null;
  try {
    const proxied = `${environment.basePath || ''}/api/file-proxy?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxied);
    if (!resp.ok) {
      // The proxy route wasn't reached / errored (a 404 here usually means the
      // basePath prefix isn't forwarded to the Next server in front of it).
      if (!environment.production) {
        console.warn(
          `[buildInitialFile] file-proxy returned ${resp.status} ${resp.statusText} for ${proxied}. ` +
          'The document preview will be empty. Check that the reverse proxy forwards ' +
          `"${environment.basePath || '/'}/api/file-proxy" to the Next server with the basePath intact.`,
        );
      }
      return null;
    }

    const blob = await resp.blob();

    // Anything that isn't a whitelisted media type is an HTML error / app-shell
    // page from a routing/basePath mismatch — do NOT seed it (that produced the
    // bogus "*.html" previews). Opening the raw S3 URL directly works because
    // <img>/tab navigation isn't CORS-gated, but fetch() is — hence the proxy.
    if (blob.type && !ALLOWED_TYPES.has(blob.type.toLowerCase())) {
      if (!environment.production) {
        console.warn(
          `[buildInitialFile] file-proxy returned a non-media response (Content-Type "${blob.type}") for ${proxied}. ` +
          'This is almost always an HTML error / app-shell page served because the request never reached ' +
          'the file-proxy route (basePath / reverse-proxy mismatch). Skipping so no bogus ".html" file is bound.',
        );
      }
      return null;
    }

    // Decode the last path segment for both the display name and its extension.
    const segment = (() => {
      try {
        return decodeURIComponent(new URL(url).pathname.split('/').pop() || '').trim();
      } catch {
        return '';
      }
    })();
    const segExt = (segment.includes('.') ? segment.split('.').pop() || '' : '').toLowerCase();

    const isPdf = segExt === 'pdf' || blob.type === 'application/pdf';
    const type = blob.type || (isPdf ? 'application/pdf' : 'image/jpeg');
    const ext = KNOWN_EXT.has(segExt) ? segExt : (isPdf ? 'pdf' : (type.split('/')[1] || 'jpg'));

    const file = new File([blob], deriveName(segment, segExt, fallbackBaseName, ext), { type });
    return {
      id: `saved-${url.slice(-24)}`,
      file,
      status: 'success',
      progress: 100,
      previewUrl: URL.createObjectURL(file),
    };
  } catch {
    return null;
  }
};
