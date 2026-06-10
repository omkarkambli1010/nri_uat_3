import { useEffect, useState } from "react";

/**
 * Reads a sessionStorage value in a hydration-safe way.
 *
 * On the server (and the very first client render) it returns `null`, so the
 * server-rendered HTML and the first client render always match — avoiding
 * React hydration error #418 ("server rendered HTML didn't match the client",
 * whose #1 cause is reading `window`/`sessionStorage` during render).
 *
 * After mount it reads the real value and re-renders once. Event handlers and
 * async callbacks run after mount, so they observe the real value too.
 *
 * Use this for sessionStorage values that influence what gets RENDERED (e.g.
 * conditionally showing a back button). For values used only inside handlers,
 * a plain `sessionStorage.getItem()` at call time is fine.
 */
export function useSessionValue(key: string): string | null {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    setValue(sessionStorage.getItem(key));
  }, [key]);

  return value;
}
