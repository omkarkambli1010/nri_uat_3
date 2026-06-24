'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, type CalendarProps } from 'primereact/calendar';

// DateField — PrimeReact Calendar wrapper for masked manual date entry.
//
//  • Auto-formats typed digits to DD/MM/YYYY  (native mask "99/99/9999")
//    e.g. typing 12042026 → 12/04/2026
//  • Blocks impossible day/month digits while typing (capture-phase keydown):
//    day tens 0–3, month tens 0–1, etc. — so a month like "45" can't be typed.
//  • The picker opens only via the calendar icon (showOnFocus={false}).
//  • Manual entry never gets wiped mid-typing (keepInvalid); the parent only
//    ever receives a valid Date or null, so existing required/min/max
//    validation keeps working unchanged.
//
// The component is controlled by the parent as Date | null, but keeps an
// internal model so PrimeReact can retain the partially-typed string.

type DateFieldProps = Omit<CalendarProps, 'value' | 'onChange' | 'ref'> & {
  value: Date | null;
  onChange: (value: Date | null) => void;
};

// Return a stable object reference for a date prop that only changes when the
// *day* changes. Callers commonly pass `maxDate={new Date()}` / `minDate={...}`
// which mint a fresh Date every render; PrimeReact's Calendar reacts to that
// reference change by reformatting its input from the controlled value, which
// wipes any half-typed text. Caching by day keeps the reference steady so manual
// entry survives re-renders. (Date-only fields don't care about time-of-day.)
function useStableDay(d: Date | null | undefined): Date | null | undefined {
  const ref = useRef<Date | null | undefined>(d);
  const cur = ref.current;
  const same =
    d instanceof Date && cur instanceof Date
      ? d.toDateString() === cur.toDateString()
      : d === cur;
  if (!same) ref.current = d;
  return ref.current;
}

export default function DateField({ value, onChange, ...rest }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Holds a committed Date, an in-progress partial string, or null.
  const [model, setModel] = useState<Date | string | null>(value);

  // Pull min/max out of the passthrough props and stabilise their references.
  const { minDate, maxDate, ...calendarRest } = rest;
  const stableMinDate = useStableDay(minDate as Date | null | undefined);
  const stableMaxDate = useStableDay(maxDate as Date | null | undefined);

  // Adopt external value changes (loaded data, picker) without clobbering a
  // partial string the user is still typing.
  useEffect(() => {
    // setModel((prev) => {
    //   if (value instanceof Date) {
    //     return prev instanceof Date && prev.getTime() === value.getTime() ? prev : value;
    //   }
    //   // value === null: clear only a committed Date, keep an in-progress string.
    //   return prev instanceof Date ? null : prev;
    // });
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      setModel((prev) =>
        prev instanceof Date && prev.getTime() === value.getTime() ? prev : value,
      );
    }
  }, [value]);

  // Block out-of-range digits before the mask inserts them. keydown runs in the
  // capture phase so preventDefault() also suppresses the mask's keypress.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    // PrimeReact's Calendar defaults inputMode to "none", which suppresses the
    // mobile soft keyboard so the date can't be typed. (The prop isn't in this
    // version's TS types, so set the attribute on the input directly.) Force a
    // numeric keyboard so manual entry works on Android/iOS.
    el.setAttribute("inputmode", "numeric");

    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // allow shortcuts
      if (e.key.length !== 1) return; // allow Backspace, Tab, arrows, Enter…
      if (!/\d/.test(e.key)) {
        e.preventDefault(); // no letters / spaces / manual separators
        return;
      }

      const v = el.value;
      const caret = el.selectionStart ?? v.length;
      const pos = v.slice(0, caret).replace(/\D/g, '').length; // digit index 0–7
      if (pos > 7) {
        e.preventDefault();
        return;
      }

      const digits = v.replace(/\D/g, '');
      const d = Number(e.key);
      const dayTens = Number(digits[0]);
      const monthTens = Number(digits[2]);

      let ok = true;
      if (pos === 0) ok = d <= 3; // day tens
      else if (pos === 1) ok = dayTens === 3 ? d <= 1 : true; // max 31
      else if (pos === 2) ok = d <= 1; // month tens
      else if (pos === 3) ok = monthTens === 1 ? d <= 2 : true; // max 12

      if (!ok) e.preventDefault();
    };

    el.addEventListener('keydown', onKeyDownCapture, true);
    return () => el.removeEventListener('keydown', onKeyDownCapture, true);
  }, []);

  return (
    <Calendar
      {...calendarRest}
      minDate={stableMinDate ?? undefined}
      maxDate={stableMaxDate ?? undefined}
      value={model as Date}
      inputRef={inputRef}
      mask="99/99/9999"
      keepInvalid
      showOnFocus={false}
      onChange={(e) => {
        setModel(e.value as Date | string);
        const v = e.value;
        onChange(v instanceof Date && !Number.isNaN(v.getTime()) ? v : null);
      }}
    />
  );
}
