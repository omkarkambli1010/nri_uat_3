
import apiService, { CountryMaster } from "@/services/api.service";

export interface Country {
  iso2: string;
  name: string;
  dialCode: string;
  status: string;
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

export function dialDigits(dialCode: string): string {
  return (dialCode.match(/\d+/) ?? [""])[0];
}

export const isSelectable = (c: Country): boolean => c.status !== "N";

let loadedCountries: Country[] = [];
let inflight: Promise<Country[]> | null = null;

export function getLoadedCountries(): Country[] {
  return loadedCountries;
}

export function loadCountries(): Promise<Country[]> {
  if (loadedCountries.length) return Promise.resolve(loadedCountries);
  if (inflight) return inflight;

  inflight = apiService
    .getCountryMaster()
    .then((rows) => {
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
      inflight = null;
      throw err;
    });

  return inflight;
}
