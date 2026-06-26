"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Country, dialDigits } from "./countries";
import styles from "./country-code-select.module.scss";

// CountryCodeSelect — searchable country-code dropdown (intl-tel-input look,
// no flags). Data is supplied by the caller (Country Master API). The trigger
// shows the selected dial code (or a "Code" placeholder); the panel has a
// search box that filters by country name or dial code.
interface Props {
  countries: Country[];
  value: string; // selected iso2
  onChange: (iso2: string) => void;
}

export default function CountryCodeSelect({ countries, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = countries.find((c) => c.iso2 === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    const qDigits = q.replace(/\D/g, "");
    // Rank each match so the most relevant countries surface first:
    // exact name / iso2, then name-prefix, then name-substring, then dial code.
    const ranked: { c: Country; rank: number }[] = [];
    for (const c of countries) {
      const name = c.name.toLowerCase();
      const code = dialDigits(c.dialCode);
      let rank = -1;
      if (name === q || c.iso2 === q) rank = 0;
      else if (name.startsWith(q)) rank = 1;
      else if (name.includes(q)) rank = 2;
      else if (qDigits && code === qDigits) rank = 3;
      else if (qDigits && code.startsWith(qDigits)) rank = 4;
      if (rank !== -1) ranked.push({ c, rank });
    }
    return ranked
      .sort((a, b) => a.rank - b.rank || a.c.name.localeCompare(b.c.name))
      .map((r) => r.c);
  }, [countries, query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Reset + focus the search box each time the panel opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const handleSelect = (iso2: string) => {
    onChange(iso2);
    setOpen(false);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Country code"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? styles.code : styles.placeholder}>
          {selected ? `+${dialDigits(selected.dialCode)}` : "Code"}
        </span>
        <span className={styles.caret} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.panel}>
          <input
            ref={searchRef}
            type="text"
            className={styles.search}
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          />
          <ul className={styles.list} role="listbox" data-lenis-prevent>
            {filtered.length === 0 && (
              <li className={styles.empty}>No results found</li>
            )}
            {filtered.map((c, i) => (
              <li key={`${c.iso2}-${c.dialCode}-${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.iso2 === value}
                  className={`${styles.option}${
                    c.iso2 === value ? ` ${styles.optionActive}` : ""
                  }`}
                  onClick={() => handleSelect(c.iso2)}
                >
                  <span className={styles.optName}>{c.name}</span>
                  <span className={styles.optCode}>+{dialDigits(c.dialCode)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
