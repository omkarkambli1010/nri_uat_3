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
  // Angular-style manual entry: single high digits auto-pad (day 4→04, month
  // 2→02), separators are auto-inserted, day capped at 31 / month at 12, and
  // Backspace over a "/" also removes the slash. When false (default) the field
  // keeps the PrimeReact masked behaviour used elsewhere.
  autoPad?: boolean;
  // Fired (autoPad only) with a message when a typed day > 31 / month > 12 is
  // rejected, and with null once valid input is entered — so the parent can
  // render the message in a <span>.
  onError?: (message: string | null) => void;
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

export default function DateField({ value, onChange, autoPad = false, onError, ...rest }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Holds a committed Date, an in-progress partial string, or null.
  const [model, setModel] = useState<Date | string | null>(value);

  // Keep the latest onError without re-running the listener effect each render.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

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

  // Parse a fully-typed "dd/mm/yyyy" string into a real Date (or null) and push
  // it up to the parent + internal model. Used by the autoPad path.
  const syncTypedDate = (str: string) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
    if (m) {
      const day = +m[1];
      const mon = +m[2];
      const yr = +m[3];
      const dt = new Date(yr, mon - 1, day);
      const real =
        dt.getDate() === day &&
        dt.getMonth() === mon - 1 &&
        dt.getFullYear() === yr;
      setModel(real ? dt : str);
      onChange(real ? dt : null);
    } else {
      setModel(str);
      onChange(null);
    }
  };

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

    // ── autoPad mode ── reformat the whole string on every input, mirroring the
    // Angular handleDateInput/handleKeyDown logic (no PrimeReact mask).
    if (autoPad) {
      let prev = el.value;

      const reformat = () => {
        let value = el.value.replace(/\D/g, ""); // digits only
        let out = "";

        // Day (DD)
        if (value.length >= 1) {
          if (+value[0] >= 4 && value.length === 1) {
            out += "0" + value[0]; // single digit 4–9 → 04–09
            value = value.slice(1);
          } else {
            out += value.slice(0, 2);
            value = value.slice(2);
          }
          if (parseInt(out, 10) > 31) {
            el.value = prev; // reject days > 31
            onErrorRef.current?.("Day cannot be greater than 31");
            return;
          }
        }
        if (out.length === 2 && value.length > 0) out += "/";

        // Month (MM)
        if (value.length >= 1) {
          if (parseInt(value[0], 10) >= 2 && value.length === 1) {
            value = "0" + value; // single digit 2–9 → 02–09
          }
          if (value.length >= 2) {
            out += value.slice(0, 2);
            value = value.slice(2);
            if (parseInt(out.slice(3, 5), 10) > 12) {
              el.value = prev; // reject months > 12
              onErrorRef.current?.("Month cannot be greater than 12");
              return;
            }
            if (value.length >= 1) out += "/";
          }
        }

        // Year (YYYY)
        if (value.length > 0) out += value.slice(0, 4);

        el.value = out;
        prev = out;
        onErrorRef.current?.(null); // valid input — clear any day/month limit message
        syncTypedDate(out);
      };

      const onInput = () => reformat();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "Backspace") {
          // Also strip a trailing "/" so backspace deletes the separator too.
          if (el.value.endsWith("/")) {
            el.value = el.value.slice(0, -1);
            prev = el.value;
            e.preventDefault();
            syncTypedDate(el.value);
          }
          return;
        }
        if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
      };

      el.addEventListener("input", onInput);
      el.addEventListener("keydown", onKeyDown, true);
      return () => {
        el.removeEventListener("input", onInput);
        el.removeEventListener("keydown", onKeyDown, true);
      };
    }

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
  }, [autoPad]);

  return (
    <Calendar
      {...calendarRest}
      minDate={stableMinDate ?? undefined}
      maxDate={stableMaxDate ?? undefined}
      value={model as Date}
      inputRef={inputRef}
      // autoPad drives its own formatting via the native input listener, so the
      // fixed-width mask is dropped in that mode.
      mask={autoPad ? undefined : "99/99/9999"}
      keepInvalid
      showOnFocus={false}
      onChange={(e) => {
        // In autoPad mode, typing is handled by the native input listener; only
        // adopt a Date coming from the picker here (ignore partial strings so we
        // don't clobber the value the listener just formatted).
        if (autoPad) {
          if (e.value instanceof Date && !Number.isNaN(e.value.getTime())) {
            setModel(e.value);
            onChange(e.value);
          }
          return;
        }
        setModel(e.value as Date | string);
        const v = e.value;
        onChange(v instanceof Date && !Number.isNaN(v.getTime()) ? v : null);
      }}
    />
  );
}
