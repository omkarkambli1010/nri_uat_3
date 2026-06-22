# FATCA page redesign

Date: 2026-06-22

## Goal

Restructure the FATCA flow so that "Country of TAX Residence" becomes part of a
repeating per-TIN group, and the upload step renders one image-upload section
per TIN entry, each containing three image slots.

## 1. Details page — `src/components/fatca/FatcaDetails.tsx`

**Top section (mandatory, non-repeating):** two fields only
1. Country of Birth
2. Citizenship

(Country of TAX Residence is removed from the top.)

**Repeating entry (1–3 entries, "Add another TIN" capped at 3):** each entry
holds three fields, in order:
1. Country of TAX Residence
2. TIN Issuing Country
3. TAX Identification Number (TIN)

Behaviour:
- When more than one entry exists, each entry shows a "TIN N / Remove" header
  (existing pattern).
- FATF-restricted countries excluded from all dropdowns (existing).
- TIN is alphanumeric, upper-cased on input (existing).

**Validation on Proceed:** both top fields valid + every entry's three fields
valid. Inline per-field error messages (existing pattern).

**Persistence on Proceed:** write to `sessionStorage`:
- `fatca_tins` — array of `{ taxResidence, tinIssuingCountry, tinNumber }`
- `fatca_meta` — `{ countryOfBirth, citizenship }`

## 2. Upload page — `src/components/fatca/FatcaUpload.tsx`

Reads `fatca_tins`. Renders **one section per entry**, titled
`TIN {n} — TIN Document Images` (with the residence / issuing country shown for
context).

Each section has **three generic upload slots** (Image 1, Image 2, Image 3).
Each slot is its own `FileUploadCard` posting
`documentType=FatcaTinProof`, tracking its own `documentId`.

**Proceed enabled** only when all three slots of every section have a successful
`documentId`.

## 3. Submit payload — `src/services/api.service.ts` `submitFatca`

One residency per entry. Final contract (from the backend curl):

```ts
{
  residencies: {
    countryCode: string;            // ISO-2 of Country of TAX Residence (e.g. "IN")
    tin: string;
    tinProofDocumentId: string;     // image slot 1
    tinProofDocumentId2: string;    // image slot 2
    tinProofDocumentId3: string;    // image slot 3
    countryofTaxResidence: string;  // full name, e.g. "India"
    tinIssuingCountry: string;      // full name, e.g. "United States"
  }[];
  usCitizen: boolean;               // citizenship === "United States"
  countryOfBirth: string;           // upper-cased name (existing behaviour)
  idempotencyKey: string;
  citizenship: string;              // full name, e.g. "India" (new top-level field)
}
```

Notes:
- The three image doc IDs are three separate keys (`tinProofDocumentId`,
  `...Id2`, `...Id3`), not an array.
- `countryCode` is the ISO-2 of Country of TAX Residence.
- `countryofTaxResidence` / `tinIssuingCountry` carry the full country names.
- New top-level `citizenship` field carries the selected citizenship name.

## Out of scope

- No change to the FATF-restricted list, country list, or ISO-2 mapping.
- No change to `FileUploadCard` / `FileUpload` internals.
