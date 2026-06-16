// Module-level slot for the optional additional document picked in the modal.
// Single file (no front/back). Mirrors ociStore / passportStore patterns —
// the store owns the objectURL lifecycle so callers only see `objectUrl`.
// Never persisted across hard reloads.

export interface AdditionalDocumentFile {
  name: string;
  blob: Blob;
  objectUrl: string;
  type: string;
  size: number;
}

let slot: AdditionalDocumentFile | null = null;

export const additionalDocumentStore = {
  set(input: { name: string; blob: Blob; type: string }): AdditionalDocumentFile {
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

  get(): AdditionalDocumentFile | null {
    return slot;
  },

  clear(): void {
    if (slot) URL.revokeObjectURL(slot.objectUrl);
    slot = null;
  },
};
