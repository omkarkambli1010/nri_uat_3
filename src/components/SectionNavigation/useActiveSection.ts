"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface Section {
  id: string;
  label: string;
}

interface UseActiveSectionResult {
  /** Id of the section currently under the viewport playhead. */
  activeId: string;
  /** Smooth-scrolls to a section and moves focus there for screen readers. */
  scrollToSection: (id: string) => void;
}

/**
 * Tracks which section is currently in view, and scrolls to a chosen one.
 *
 * How the tracking works: rather than measuring scroll offsets on every frame,
 * we collapse the IntersectionObserver root to a zero-height line across the
 * middle of the viewport (`rootMargin: -50% 0px -50% 0px`). A section
 * "intersects" only while it straddles that line, so for contiguous sections
 * exactly one is active at a time and the browser does the work off the main
 * thread. No scroll listener is involved.
 */
export function useActiveSection(
  sections: Section[],
  /** Where the playhead sits: 0 = viewport top, 1 = viewport bottom. */
  anchor = 0.5,
): UseActiveSectionResult {
  const [activeId, setActiveId] = useState<string>(() => sections[0]?.id ?? "");

  // While a click-initiated smooth scroll is travelling, the observer fires for
  // every section it passes through. Without this the indicator strobes down
  // the list instead of moving once to the destination.
  const suppressRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  // `sections` is usually an inline literal, so its identity changes on every
  // render. Keying the effect on the ids themselves stops us from tearing down
  // and rebuilding the observer each time.
  const idsKey = useMemo(() => sections.map((s) => s.id).join("|"), [sections]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const ids = idsKey ? idsKey.split("|") : [];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const topMargin = anchor * 100;
    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressRef.current) return;
        const hit = entries.find((entry) => entry.isIntersecting);
        // No hit means the playhead is between sections — keep the last active
        // one rather than clearing, which would blank the indicator mid-scroll.
        if (hit) setActiveId(hit.target.id);
      },
      {
        rootMargin: `-${topMargin}% 0px -${100 - topMargin}% 0px`,
        threshold: 0,
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [idsKey, anchor]);

  // Drop the pending scrollend listener and timer if we unmount mid-scroll.
  useEffect(() => () => releaseRef.current?.(), []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Paint the destination immediately — waiting for the scroll to arrive
    // makes the click feel unresponsive.
    setActiveId(id);
    suppressRef.current = true;

    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });

    // Send focus along with the scroll, otherwise keyboard and screen-reader
    // users jump visually but their focus stays behind in the nav.
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });

    // Cancel any release still pending from a previous click.
    releaseRef.current?.();

    const release = () => {
      suppressRef.current = false;
      window.removeEventListener("scrollend", release);
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      releaseRef.current = null;
    };
    releaseRef.current = release;

    // `scrollend` is the precise signal but is not in every browser yet, and it
    // never fires at all when the page is already at the target. The timeout
    // covers both cases; whichever lands first tears down the other.
    window.addEventListener("scrollend", release);
    releaseTimerRef.current = window.setTimeout(release, 1000);
  }, []);

  return { activeId, scrollToSection };
}

export default useActiveSection;
