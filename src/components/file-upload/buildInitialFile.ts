'use client';

import type { UploadedFile } from './fileUpload.types';

// Turns a saved document's presigned S3 URL into an UploadedFile so it renders
// in the dropzone as a "previously uploaded" proof. Used by every "revisit
// shows previously uploaded documents" screen (foreign/permanent address, visa,
// passport, OCI, FATCA) so the filename logic lives in exactly one place.
//
// The presigned S3 URL is bound DIRECTLY as the preview (`previewUrl = url`) —
// no `/api/file-proxy` round-trip. Presigned URLs render fine in <img> / tab
// navigation because image loads aren't CORS-gated (only `fetch()` is, which is
// why the old server-side proxy existed). That proxy fetched S3 from the Next
// server, which was unreliable on some networks — so it's gone.
//
// The document bytes are never re-sent from here: re-submission of a saved proof
// uses its saved `documentId`, not these bytes. So a lightweight, byte-less File
// (carrying just the derived name + MIME type) is all the card needs to drive
// the filename label, the image-vs-doc preview branch, and the icon.

const KNOWN_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

// Maps a file extension to the MIME type the card uses to decide image-vs-doc
// preview (see isImageFile/isPdfFile). Defaults to JPEG for unknown extensions.
const EXT_TO_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

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
 * Build an UploadedFile preview from a saved document's presigned S3 URL.
 *
 * Binds the URL directly — no network fetch — so it works wherever the browser
 * can reach S3 (image previews load straight from the presigned URL). Returns
 * `null` only for an empty/invalid URL.
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
    // Decode the last path segment for both the display name and its extension.
    const segment = (() => {
      try {
        return decodeURIComponent(new URL(url).pathname.split('/').pop() || '').trim();
      } catch {
        return '';
      }
    })();
    const segExt = (segment.includes('.') ? segment.split('.').pop() || '' : '').toLowerCase();

    const ext = KNOWN_EXT.has(segExt) ? segExt : 'jpg';
    const type = EXT_TO_TYPE[ext] ?? 'image/jpeg';
    const name = deriveName(segment, segExt, fallbackBaseName, ext);

    // Byte-less placeholder — see file header for why the bytes aren't needed.
    const file = new File([], name, { type });

    return {
      id: `saved-${url.slice(-24)}`,
      file,
      status: 'success',
      progress: 100,
      previewUrl: url,
    };
  } catch {
    return null;
  }
};
