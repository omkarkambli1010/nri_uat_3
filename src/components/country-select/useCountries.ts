"use client";

import { useEffect, useState } from "react";
import {
  Country,
  loadCountries,
  getLoadedCountries,
  isSelectable,
} from "./countries";

// useCountries — loads the cached Country Master and re-renders when ready.
// `all` is every country; `selectable` excludes restricted (status "N") rows.
// Loading is shared across components (module-level cache), so mounting many
// dropdowns triggers at most one network request.
export function useCountries(): {
  countries: Country[];
  selectable: Country[];
  loading: boolean;
} {
  const [countries, setCountries] = useState<Country[]>(getLoadedCountries);
  const [loading, setLoading] = useState(getLoadedCountries().length === 0);

  useEffect(() => {
    let alive = true;
    loadCountries()
      .then((list) => {
        if (alive) {
          setCountries(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return {
    countries,
    selectable: countries.filter(isSelectable),
    loading,
  };
}

// Convenience for the string-based dropdowns that only need display names.
export function useCountryNames(): { names: string[]; loading: boolean } {
  const { selectable, loading } = useCountries();
  return { names: selectable.map((c) => c.name), loading };
}
