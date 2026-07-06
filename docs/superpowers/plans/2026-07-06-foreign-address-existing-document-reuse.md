# Foreign Address — Existing Document Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a revisit to the Foreign Address page, re-submit already-saved proof documents by id (`ExistingFrontDocumentId`/`ExistingBackDocumentId`) instead of forcing a re-upload of 0-byte placeholder files.

**Architecture:** Capture each saved document's id from the FOREIGNADDRESS stagewise `documents[]` during prefill. Distinguish a seeded byte-less preview (id prefixed `saved-`) from a freshly-picked file. Gate Proceed per-slot, and on submit send, per slot, either the fresh `File` or the existing document id. The multipart builder appends only the fields that are present, so the first-time path (files only) and revisit path (ids only) each produce the exact curl shapes.

**Tech Stack:** Next.js (App Router), React client components, TypeScript, axios multipart `FormData`.

## Global Constraints

- **No test framework in this repo.** `jest` is scripted but not installed and there are zero test files. Verification is by `npx tsc --noEmit`, `npm run lint`, and driving the running app (`npm run dev`) while watching the network request — the same approach as the existing specs in `docs/superpowers/specs/`. Do **not** add a test harness.
- **No UI/layout/styling/copy changes.** Only gate logic and payload shape change.
- **First-time upload path must be byte-for-byte unchanged:** no existing ids → request carries `FrontFile`/`BackFile` and omits `Existing*DocumentId`.
- **Existing-id form omits file fields, and file form omits id fields** — append conditionally, never send empty strings for the unused pair.
- **Document → slot mapping:** `documents[0]` → front, `documents[1]` → back (consistent with the current preview seeding order in `ForeignAddress.tsx`).
- **ID key casing:** read `doc.documentId ?? doc.documentID ?? doc.id` (matches `FatcaUpload.tsx`).
- **Seeded-preview signal:** `buildInitialFileFromUrl` sets `id: saved-${url.slice(-24)}` and a byte-less `File` (size 0). A real pick has a `generateId()` id and `size > 0`.

---

### Task 1: Widen `submitForeignAddress` to accept optional files + existing ids

**Files:**
- Modify: `src/services/api.service.ts:667-705`

**Interfaces:**
- Produces: `apiService.submitForeignAddress(applicationId, data, hideSpinner?)` where `data` now types `frontFile?: File`, `backFile?: File`, `existingFrontDocumentId?: string`, `existingBackDocumentId?: string` (all four optional; all existing address fields unchanged). The request appends `FrontFile`/`BackFile` only when a file is passed, and `ExistingFrontDocumentId`/`ExistingBackDocumentId` only when an id is passed.

- [ ] **Step 1: Change the `data` parameter type**

In `src/services/api.service.ts`, in `submitForeignAddress`, replace the two required file fields:

```ts
      frontFile: File;
      backFile: File;
      idempotencyKey?: string;
```

with optional files plus the existing-id fields:

```ts
      frontFile?: File;
      backFile?: File;
      existingFrontDocumentId?: string;
      existingBackDocumentId?: string;
      idempotencyKey?: string;
```

- [ ] **Step 2: Make the multipart file section conditional**

In the same method, replace:

```ts
    // Files
    form.append("BackFile", data.backFile);
    form.append("FrontFile", data.frontFile);
```

with:

```ts
    // Files (first-time upload) — appended only when a fresh file is provided.
    if (data.backFile) form.append("BackFile", data.backFile);
    if (data.frontFile) form.append("FrontFile", data.frontFile);

    // Existing documents (revisit) — appended only when re-using a saved proof
    // by id. The id form omits the file fields entirely (and vice versa).
    if (data.existingBackDocumentId)
      form.append("ExistingBackDocumentId", data.existingBackDocumentId);
    if (data.existingFrontDocumentId)
      form.append("ExistingFrontDocumentId", data.existingFrontDocumentId);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (It will still fail later only if Task 2's caller is out of sync — at this point the sole caller `ForeignAddress.tsx` still passes `File` values, which satisfy `File | undefined`, so it passes now.)

- [ ] **Step 4: Commit**

```bash
git add src/services/api.service.ts
git commit -m "feat: submitForeignAddress accepts existing document ids"
```

---

### Task 2: Capture existing ids, gate per-slot, and wire the submit in `ForeignAddress.tsx`

**Files:**
- Modify: `src/components/foreign-address/ForeignAddress.tsx` — state (~179), prefill (~232), helpers/gate (181-185), `handleProceed` (371-408)

**Interfaces:**
- Consumes: `apiService.submitForeignAddress` from Task 1 (optional files + `existingFrontDocumentId`/`existingBackDocumentId`).
- Produces: no exported API change; internal `frontReady`/`backReady`/`filesReady` gate and per-slot submit payload.

- [ ] **Step 1: Add state for the captured document ids**

In `ForeignAddress.tsx`, right after the `backInitial` state declaration (currently line 179):

```ts
  const [backInitial, setBackInitial] = useState<UploadedFile | null>(null);
```

add:

```ts
  // Existing proof document ids captured from the saved stage's documents[]
  // (index 0 → front, 1 → back). Sent as Existing*DocumentId on a revisit when
  // the user hasn't re-picked that slot's file.
  const [frontDocumentId, setFrontDocumentId] = useState('');
  const [backDocumentId, setBackDocumentId] = useState('');
```

- [ ] **Step 2: Replace the file-presence helpers with fresh-file + readiness logic**

Replace the current block (lines 181-185):

```ts
  const getFrontFile = (): File | null =>
    frontFiles.find((f) => f.file instanceof File)?.file ?? null;
  const getBackFile = (): File | null =>
    backFiles.find((f) => f.file instanceof File)?.file ?? null;
  const filesReady = getFrontFile() !== null && getBackFile() !== null;
```

with:

```ts
  // A freshly-picked file: a real File with bytes that isn't the byte-less
  // saved-document preview (those carry an id prefixed "saved-").
  const getFreshFile = (files: UploadedFile[]): File | null =>
    files.find(
      (f) => f.file instanceof File && !f.id.startsWith('saved-') && f.file.size > 0,
    )?.file ?? null;

  // Whether the seeded saved-document preview is still shown for a slot. Removing
  // it (without picking a new file) makes the slot not-ready, forcing a re-pick.
  const hasSeeded = (files: UploadedFile[]): boolean =>
    files.some((f) => f.id.startsWith('saved-'));

  const freshFront = getFreshFile(frontFiles);
  const freshBack = getFreshFile(backFiles);

  // Per-slot readiness: a new file was picked, OR a saved document exists and its
  // preview is still shown (so it can be re-sent by id).
  const frontReady = freshFront !== null || (!!frontDocumentId && hasSeeded(frontFiles));
  const backReady = freshBack !== null || (!!backDocumentId && hasSeeded(backFiles));
  const filesReady = frontReady && backReady;
```

(`canSubmit = isValid && filesReady && !submitting;` at line 356 is unchanged and now reads the new `filesReady`.)

- [ ] **Step 3: Capture the document ids during prefill**

In the prefill effect, the `docs` array is built (currently lines 232-234):

```ts
        const docs = Array.isArray(res?.documents)
          ? (res.documents as Record<string, unknown>[])
          : [];
```

Immediately after that block, add:

```ts
        // Capture the saved proof document ids (index 0 → front, 1 → back) so a
        // revisit can re-submit them by id instead of re-uploading the bytes.
        const pickDocId = (doc: Record<string, unknown> | undefined): string => {
          const v = doc?.documentId ?? doc?.documentID ?? doc?.id;
          return v == null ? '' : String(v);
        };
        if (pickDocId(docs[0])) setFrontDocumentId(pickDocId(docs[0]));
        if (pickDocId(docs[1])) setBackDocumentId(pickDocId(docs[1]));
```

- [ ] **Step 4: Update the missing-document guards in `handleProceed`**

Replace the current file guards (lines 371-385):

```ts
    const frontFile = getFrontFile();
    const backFile = getBackFile();
    // Files have no inline error slot, so call out which proof is missing.
    if (!frontFile && !backFile) {
      toast.error('Please upload the front and back of your document.');
      return;
    }
    if (!frontFile) {
      toast.error('Please upload the front of your document.');
      return;
    }
    if (!backFile) {
      toast.error('Please upload the back of your document.');
      return;
    }
```

with readiness-based guards:

```ts
    // Each slot needs either a freshly-picked file or a still-shown saved proof.
    if (!frontReady && !backReady) {
      toast.error('Please upload the front and back of your document.');
      return;
    }
    if (!frontReady) {
      toast.error('Please upload the front of your document.');
      return;
    }
    if (!backReady) {
      toast.error('Please upload the back of your document.');
      return;
    }
```

- [ ] **Step 5: Send file OR existing id per slot in the submit payload**

In `handleProceed`, replace the two file lines in the `submitForeignAddress` call (currently lines 406-407):

```ts
        frontFile,
        backFile,
```

with:

```ts
        // Per slot: send the freshly-picked file, otherwise re-use the saved
        // document by id (revisit without re-upload).
        frontFile: freshFront ?? undefined,
        backFile: freshBack ?? undefined,
        existingFrontDocumentId: freshFront ? undefined : frontDocumentId,
        existingBackDocumentId: freshBack ? undefined : backDocumentId,
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: PASS (no references to the removed `getFrontFile`/`getBackFile` remain).

Run: `npm run lint`
Expected: PASS (no unused-var or hook warnings for the changed file).

- [ ] **Step 7: Commit**

```bash
git add src/components/foreign-address/ForeignAddress.tsx
git commit -m "feat: reuse saved foreign-address documents by id on revisit"
```

---

### Task 3: Verify all four request shapes in the running app

**Files:** none (manual verification against `npm run dev`).

**Interfaces:**
- Consumes: the running app + browser devtools Network tab (or the Claude-in-Chrome `read_network_requests` tool) inspecting the multipart body of `POST applications/{id}/address/foreign`.

- [ ] **Step 1: Start the app**

Run: `npm run dev`
Expected: dev server up (default `http://localhost:3000`).

- [ ] **Step 2: First-time upload**

Reach `/foreignAddress` on a fresh application with no saved FOREIGNADDRESS documents. Fill all fields, upload Front and Back, click Proceed.
Expected: the request's multipart body contains `FrontFile` and `BackFile` parts and **no** `ExistingFrontDocumentId`/`ExistingBackDocumentId`. Navigation proceeds.

- [ ] **Step 3: Revisit, no changes**

Return to `/foreignAddress` for that application. Previews load for both slots; Proceed is enabled **without** re-uploading. Click Proceed.
Expected: the body contains `ExistingFrontDocumentId` and `ExistingBackDocumentId` (non-empty) and **no** `FrontFile`/`BackFile` parts.

- [ ] **Step 4: Revisit, replace one slot**

Return again; re-pick **only** the Front file, leave Back as the seeded preview. Click Proceed.
Expected: the body contains `FrontFile` **and** `ExistingBackDocumentId`, and neither `BackFile` nor `ExistingFrontDocumentId`.

- [ ] **Step 5: Revisit, remove one slot**

Return again; remove the Back preview without picking a new file.
Expected: Proceed becomes disabled (`backReady` false); no request is sent.

- [ ] **Step 6: Record the result**

Confirm all four scenarios matched. If any diverged, stop and diagnose (likely `documents[]` ordering or id key casing) before considering the plan complete.

---

## Self-Review

**Spec coverage:**
- Capture existing ids from `documents[]` → Task 2 Step 3. ✓
- Distinguish seeded vs fresh → Task 2 Step 2. ✓
- Per-slot readiness + gate → Task 2 Step 2 (`frontReady`/`backReady`), Step 4 (guards). ✓
- Per-slot submit (file OR id) → Task 2 Step 5. ✓
- API signature (optional files + existing ids, conditional append) → Task 1. ✓
- Removal blocks Proceed → `hasSeeded` requirement in Task 2 Step 2; verified Task 3 Step 5. ✓
- First-time path unchanged → Task 1 conditional append; verified Task 3 Step 2. ✓
- Four verification scenarios → Task 3. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every code step shows exact code. ✓

**Type consistency:** `getFreshFile`/`hasSeeded`/`freshFront`/`freshBack`/`frontReady`/`backReady`/`filesReady`/`frontDocumentId`/`backDocumentId`/`pickDocId` are defined in Task 2 and used consistently. `submitForeignAddress` field names (`frontFile`, `backFile`, `existingFrontDocumentId`, `existingBackDocumentId`) match between Task 1 (definition) and Task 2 Step 5 (caller). Form-field names (`FrontFile`, `BackFile`, `ExistingFrontDocumentId`, `ExistingBackDocumentId`) match the curl. ✓
