# Foreign Address — reuse existing documents on revisit

**Date:** 2026-07-06
**Route/Component:** `/foreignAddress` → `src/components/foreign-address/ForeignAddress.tsx`
**API:** `apiService.submitForeignAddress` (`POST applications/{id}/address/foreign`, multipart)

## Problem

On a revisit to the Foreign Address page, the saved proof documents are fetched
from the FOREIGNADDRESS stagewise response and seeded into the Front/Back upload
cards as previews. But the page still forces a re-upload:

- The seeded preview is a **byte-less `File` placeholder** (`new File([], name)`,
  size 0) produced by `buildInitialFileFromUrl`.
- `getFrontFile()` returns the first `File` instance it finds, so on revisit
  `filesReady` is already `true` and clicking **Proceed submits a 0-byte
  `FrontFile`/`BackFile`**.

Desired: a revisit should re-submit the already-saved documents **by id**, sending
`ExistingFrontDocumentId` / `ExistingBackDocumentId` instead of the file bytes —
mirroring the two curl shapes:

- **First-time:** `--form FrontFile=@... --form BackFile=@...` (no existing-id fields)
- **Revisit:** `--form ExistingFrontDocumentId=... --form ExistingBackDocumentId=...`
  (no file fields)

## Decisions

- **ID source:** the existing document IDs come from the stagewise response's
  `documents[]` array — the same entries already used to seed the previews. Index
  `0` → front, index `1` → back (consistent with the existing preview ordering).
  ID is read across casings: `doc.documentId ?? doc.documentID ?? doc.id` (the
  FATCA pattern in `FatcaUpload.tsx`).
- **Per-slot independent:** each of Front/Back sends its new file if the user
  re-picked one, otherwise its `ExistingDocumentId`. Front=new file + back=existing
  id in a single request is allowed.
- **Removal blocks Proceed:** if the user removes a seeded document without picking
  a new file, that slot becomes not-ready and Proceed disables until they pick a
  new file. Existing IDs are only sent while the seeded preview is still shown.

## Design

### 1. Prefill — capture existing document IDs (`ForeignAddress.tsx`)

In the existing prefill effect, alongside seeding `frontInitial`/`backInitial`
from `documents[]`, read the document IDs from the same entries and store them:

```ts
const pickDocId = (doc: Record<string, unknown>): string => {
  const v = doc?.documentId ?? doc?.documentID ?? doc?.id;
  return v == null ? '' : String(v);
};
// docs[0] → front, docs[1] → back
if (pickDocId(docs[0])) setFrontDocumentId(pickDocId(docs[0]));
if (pickDocId(docs[1])) setBackDocumentId(pickDocId(docs[1]));
```

New state: `frontDocumentId`, `backDocumentId` (both `string`, default `''`).

### 2. Distinguish a seeded preview from a fresh pick

The seeded entry's `id` starts with `saved-` (from `buildInitialFileFromUrl`:
`id: saved-${url.slice(-24)}`) and its file is size 0; a real pick gets a fresh
`generateId()` id and real bytes.

```ts
const getFreshFile = (files: UploadedFile[]): File | null =>
  files.find(
    (f) => f.file instanceof File && !f.id.startsWith('saved-') && f.file.size > 0,
  )?.file ?? null;

const hasSeeded = (files: UploadedFile[]): boolean =>
  files.some((f) => f.id.startsWith('saved-'));
```

Replaces the current `getFrontFile`/`getBackFile`/`filesReady` logic.

### 3. Per-slot readiness + gate

```ts
const freshFront = getFreshFile(frontFiles);
const freshBack  = getFreshFile(backFiles);

const frontReady = freshFront !== null || (!!frontDocumentId && hasSeeded(frontFiles));
const backReady  = freshBack  !== null || (!!backDocumentId  && hasSeeded(backFiles));

const canSubmit = isValid && frontReady && backReady && !submitting;
```

`handleProceed` missing-document toasts key off `frontReady`/`backReady` instead of
raw file presence.

### 4. Submit — send file OR existing id per slot

`handleProceed` passes per-slot: the fresh `File` if present, else the existing id.

```ts
await apiService.submitForeignAddress(applicationId, {
  ...addressFields,
  frontFile: freshFront ?? undefined,
  backFile:  freshBack  ?? undefined,
  existingFrontDocumentId: freshFront ? undefined : frontDocumentId,
  existingBackDocumentId:  freshBack  ? undefined : backDocumentId,
});
```

### 5. `api.service.ts` — `submitForeignAddress`

- `frontFile` / `backFile` become **optional** (`File | undefined`).
- Add optional `existingFrontDocumentId` / `existingBackDocumentId` (`string`).
- Append `FrontFile`/`BackFile` **only when a file is passed**.
- Append `ExistingFrontDocumentId`/`ExistingBackDocumentId` **only when an id is
  passed** (the id form omits the file fields — matching the curl).
- Address fields and `IdempotencyKey` (empty) unchanged.

## Out of scope / unchanged

- No UI/layout, styling, or copy changes.
- First-time upload path is unchanged: no existing IDs → sends files exactly as
  today.
- Only caller of `submitForeignAddress` is `ForeignAddress.tsx` (verified), so the
  signature change is self-contained.

## Test / verification

Drive both paths in the running app:

1. **First time:** fresh application, fill fields, upload front+back, Proceed →
   network shows `FrontFile`/`BackFile` present, no `Existing*DocumentId`.
2. **Revisit, no changes:** return to page, previews load, Proceed enabled without
   re-upload → network shows `ExistingFrontDocumentId`/`ExistingBackDocumentId`, no
   file parts.
3. **Revisit, replace one:** re-pick only Front → request has `FrontFile` +
   `ExistingBackDocumentId`.
4. **Revisit, remove one:** remove Back preview without re-pick → Proceed disabled.
