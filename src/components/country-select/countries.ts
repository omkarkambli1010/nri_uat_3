// Country list for the nationality / country dropdowns.
//
// Source of truth is the backend Country Master (POST …/masters/get with
// masterName "COUNTRYMASTER"), consumed via apiService.getCountryMaster().
// The fetch is cached at module scope so the master is loaded once per session
// and shared across every dropdown. React components should use the
// `useCountries` hook (./useCountries); non-React helpers can read the already
// loaded list synchronously via getLoadedCountries().
//
// iso2 (the flag CSS modifier .iti__<iso2>, defined globally in globals.scss)
// is derived from the master's countryCode, which is "ISO2/ISO3" (e.g.
// "AF/AFG") or occasionally just "ISO2" ("IN").

import apiService, { CountryMaster } from "@/services/api.service";

export interface Country {
  /** ISO 3166-1 alpha-2, lowercase — also the flag CSS modifier (.iti__<iso2>). */
  iso2: string;
  /** English display name. */
  name: string;
  /** International dialling code (master teleCode), e.g. "91", "1-684". */
  dialCode: string;
  /** Country Master status: "Y" = selectable, "N" = restricted. */
  status: string;
  /** Raw Country Master countryCode, verbatim — "ISO2/ISO3" ("AF/AFG") or just "ISO2" ("IN"). */
  countryCode: string;
}

/** Map a raw Country Master row to the dropdown-friendly Country shape. */
export function toCountry(c: CountryMaster): Country {
  const countryCode = (c.countryCode || "").trim();
  const iso2 = countryCode.split("/")[0].trim().toLowerCase();
  return {
    iso2,
    name: c.countryName,
    dialCode: (c.teleCode || "").trim(),
    status: (c.status || "").toUpperCase(),
    countryCode,
  };
}

/** Leading numeric group of a dialling code — "1-684" → "1", "91" → "91". */
export function dialDigits(dialCode: string): string {
  return (dialCode.match(/\d+/) ?? [""])[0];
}

/** A country is selectable unless the master explicitly marks it restricted. */
export const isSelectable = (c: Country): boolean => c.status !== "N";

let loadedCountries: Country[] = [];
let inflight: Promise<Country[]> | null = null;

/**
 * Already-loaded countries, or [] if the master hasn't resolved yet.
 * For non-React helpers; React code should prefer the useCountries hook.
 */
export function getLoadedCountries(): Country[] {
  return loadedCountries;
}

/**
 * Fetch + cache the Country Master. Concurrent callers share one request;
 * a failed fetch clears the cache so the next caller retries.
 */
export function loadCountries(): Promise<Country[]> {
  if (loadedCountries.length) return Promise.resolve(loadedCountries);
  if (inflight) return inflight;

  inflight = apiService
    .getCountryMaster()
    .then((rows) => {
      // The master can contain fully duplicated rows (e.g. "Dominican Republic"
      // appears 3×). Dedupe by iso2 (falling back to name) so consumers get a
      // clean list with unique keys for their dropdowns.
      const seen = new Set<string>();
      loadedCountries = rows.map(toCountry).filter((c) => {
        const key = c.iso2 || c.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return loadedCountries;
    })
    .catch((err) => {
      inflight = null; // allow a retry on the next mount
      throw err;
    });

  return inflight;
}
