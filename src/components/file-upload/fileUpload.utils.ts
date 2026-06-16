import type { FileUploadConfig, UploadedFile } from './fileUpload.types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isImageFile(file: File): boolean {
 return /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/i.test(file.type);
}
 

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

export function validateFile(
  file: File,
  config: Pick<FileUploadConfig, 'accept' | 'maxSizeMB' | 'errorMessages'>
): string | null {
  // Normalise image/jpg → image/jpeg (browsers always report image/jpeg)
  const normalizedType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;

  if (config.accept.length > 0 && !config.accept.includes(normalizedType)) {
    if (config.errorMessages?.type) return config.errorMessages.type;
    const exts = config.accept
      .map(t => t.split('/')[1]?.toUpperCase())
      .filter(Boolean)
      .join(', ');
    return `Type not allowed. Accepted: ${exts}`;
  }

  if (file.size > config.maxSizeMB * 1024 * 1024) {
    return config.errorMessages?.size ?? `Exceeds ${config.maxSizeMB} MB limit`;
  }

  return null;
}

export function isDuplicateFile(file: File, existing: UploadedFile[]): boolean {
  return existing.some(f => f.file.name === file.name && f.file.size === file.size);
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getAcceptString(accept: string[]): string {
  return accept.join(',');
}

// ── PDF password protection ────────────────────────────────────────────────────

/**
 * Checks if a PDF file is password protected by scanning the trailer section
 * (last 8 KB) for the /Encrypt dictionary marker required by the PDF spec.
 */
export async function isPdfPasswordProtected(file: File): Promise<boolean> {
  if (file.type !== 'application/pdf') return false;
  try {
    const checkSize = Math.min(file.size, 8192);
    const tail = file.slice(file.size - checkSize);
    const buf = await tail.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buf);
    return text.includes('/Encrypt');
  } catch {
    return false;
  }
}

// Lazy singleton so we only configure the worker once per session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pdfjs: any = null;
async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist');
    if (!_pdfjs.GlobalWorkerOptions.workerSrc) {
      _pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${_pdfjs.version}/build/pdf.worker.min.mjs`;
    }
  }
  return _pdfjs;
}

/**
 * Validates the password and renders each page of the encrypted PDF to canvas,
 * then re-encodes the pages as JPEG images inside a new unencrypted PDF via pdf-lib.
 *
 * Throws:
 *   'WRONG_PASSWORD'  – password is incorrect
 *   'UNLOCK_FAILED'   – rendering or reconstruction failed
 */
export async function unlockPdf(file: File, password: string): Promise<File> {
  const pdfjsLib = await getPdfjs();
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Load the encrypted PDF with the given password
  const loadingTask = pdfjsLib.getDocument({ data: bytes, password });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf: any;
  try {
    pdf = await loadingTask.promise;
  } catch (err: unknown) {
    const name = (err && typeof err === 'object' && 'name' in err) ? (err as { name: string }).name : '';
    const code = (err && typeof err === 'object' && 'code' in err) ? (err as { code: number }).code : 0;
    if (name === 'PasswordException' && code === 2 /* INCORRECT_PASSWORD */) {
      throw new Error('WRONG_PASSWORD');
    }
    throw new Error('UNLOCK_FAILED');
  }

  // Render each page to a canvas and collect JPEG bytes
  const { PDFDocument } = await import('pdf-lib');
  const outputDoc = await PDFDocument.create();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport1x = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 1.5 }); // render at 1.5× for quality

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) { page.cleanup(); continue; }

    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(',')[1]), c => c.charCodeAt(0));

    const img = await outputDoc.embedJpg(jpegBytes);
    const outPage = outputDoc.addPage([viewport1x.width, viewport1x.height]);
    outPage.drawImage(img, { x: 0, y: 0, width: viewport1x.width, height: viewport1x.height });
  }

  const outputBytes = await outputDoc.save();
  // pdf-lib returns Uint8Array — use the underlying buffer for File constructor
  return new File([outputBytes.buffer as ArrayBuffer], file.name, { type: 'application/pdf' });
}

export function deriveAcceptLabel(accept: string[]): string {
  const labels = accept
    .map(t => {
      const sub = t.split('/')[1]?.toUpperCase();
      // Normalise JPEG → JPG for human-friendly display
      return sub === 'JPEG' ? 'JPG' : sub;
    })
    .filter((v): v is string => !!v)
    .filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate

  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`;
}
