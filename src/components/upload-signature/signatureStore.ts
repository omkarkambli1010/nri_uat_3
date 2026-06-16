// Module-level transfer slot for a signature file picked on one route and
// consumed on another (e.g. picked in the modal on /uploadSignatureinfo and
// shown in the verify state on /uploadSignature). Survives client-side
// navigation because the JS bundle is the same; never persisted.
//
// Stores a Blob + an objectURL pointer. The consumer owns lifecycle once it
// calls take() and should revoke the objectURL when it's done.

export interface PendingSignature {
  name: string;
  blob: Blob;
  objectUrl: string;
  type: string;
  size: number;
}

let pending: PendingSignature | null = null;

export const signatureStore = {
  get(): PendingSignature | null {
    return pending;
  },
  take(): PendingSignature | null {
    const v = pending;
    pending = null;
    return v;
  },
  set(next: PendingSignature): void {
    pending = next;
  },
  clear(): void {
    if (pending) URL.revokeObjectURL(pending.objectUrl);
    pending = null;
  },
};
