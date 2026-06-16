// Module-level transfer slot for the TIN document picked in FatcaUploadSheet
// and consumed by FatcaDocument. Survives client-side navigation (same JS
// bundle); never persisted — a hard reload clears it.
//
// Mirrors oci/ociStore but holds a single document. The store owns the file's
// objectURL lifecycle: `set` revokes the URL it replaces and creates a fresh
// one; `clear` revokes on the way out.

export interface FatcaFile {
  name: string;
  blob: Blob;
  objectUrl: string;
  type: string;
  size: number;
}

let slot: FatcaFile | null = null;

export const fatcaStore = {
  // Stores `blob`, creating a fresh objectURL. Any file already held has its
  // objectURL revoked first.
  set(input: { name: string; blob: Blob; type: string }): FatcaFile {
    if (slot) URL.revokeObjectURL(slot.objectUrl);
    slot = {
      name: input.name,
      blob: input.blob,
      objectUrl: URL.createObjectURL(input.blob),
      type: input.type || input.blob.type,
      size: input.blob.size,
    };
    return slot;
  },

  // Non-clearing read — the preview screen calls this, so the slot keeps its
  // value and back-navigation within the session still shows the file.
  get(): FatcaFile | null {
    return slot;
  },

  // Revokes and clears the held file.
  clear(): void {
    if (slot) URL.revokeObjectURL(slot.objectUrl);
    slot = null;
  },
};
