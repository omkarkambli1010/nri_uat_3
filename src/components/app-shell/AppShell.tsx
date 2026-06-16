"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/header/Header";
import Spinner from "@/components/spinner/Spinner";
import Lenis from "lenis";

// AppShell — equivalent to Angular AppComponent
// Handles: header visibility, back-button prevention, devtools blocking,
// right-click prevention, zoom disable, smooth scrolling (Lenis), cache clearing

export default function AppShell({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();
  // Flags shared between the wrapped history methods and the popstate / re-arm
  // logic so a *programmatic* nav (router.back/forward/go) isn't treated like a
  // native Back/Forward.
  const skipRepinRef = useRef(false);
  const skipArmRef = useRef(false);

  // Keep a guard history entry on top of EVERY page so the native Back/Forward
  // is trapped on all routes (not just the first). Skip right after a
  // programmatic nav — the destination already has its guard, and re-pushing
  // would accumulate guards and break in-app back.
  useEffect(() => {
    if (skipArmRef.current) {
      skipArmRef.current = false;
      return;
    }
    window.history.pushState(null, "", window.location.href);
  }, [pathname]);

  // Bootstrap JS bundle (Popper + Collapse/Modal/Dropdown handlers) — required
  // for the data-bs-toggle="collapse" accordion buttons in HomeComponent.
  // Loaded client-side only; the bundle touches `document` at import time,
  // which crashes during SSR.
  useEffect(() => {
    // @ts-expect-error — prebuilt bootstrap bundle ships no type declarations
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  useEffect(() => {
    // Clear service worker caches on load
    if ("caches" in window) {
      caches
        .keys()
        .then((names) => Promise.all(names.map((n) => caches.delete(n))))
        .catch((e) => console.error("Error clearing caches:", e));
    }

    // Disable the BROWSER Back/Forward buttons while keeping the in-app back
    // arrows (router.back()) working — across all browsers.
    //
    // How: a guard history entry is kept on top of every page (see the
    // per-route effect above). The native Back button (and swipe-back) fires
    // `popstate` WITHOUT going through window.history.back(); we re-pin the
    // current URL there, so the user can't leave. Programmatic navigation —
    // router.back()/forward()/go() — goes THROUGH the wrapped window.history
    // methods, which flag the action so popstate/re-arm skip their guard logic.
    // router.back() does go(-2) to step over the guard onto the real previous
    // page. router.push() uses pushState (no popstate) and is unaffected.
    const origBack = window.history.back.bind(window.history);
    const origForward = window.history.forward.bind(window.history);
    const origGo = window.history.go.bind(window.history);

    const markProgrammatic = () => {
      skipRepinRef.current = true; // popstate: don't re-pin
      skipArmRef.current = true; // re-arm effect: don't push another guard
    };
    window.history.back = () => {
      markProgrammatic();
      origGo(-2); // step over the guard onto the actual previous page
    };
    window.history.forward = () => {
      markProgrammatic();
      origForward();
    };
    window.history.go = (delta?: number) => {
      markProgrammatic();
      origGo(delta);
    };

    const handlePopState = () => {
      if (skipRepinRef.current) {
        skipRepinRef.current = false; // programmatic nav — let it through
        return;
      }
      window.history.pushState(null, "", window.location.href); // native Back/Forward — block
    };
    window.addEventListener("popstate", handlePopState);

    // Smooth scrolling with Lenis
    const lenis = new Lenis({ duration: 2.0, smoothWheel: true });
    lenisRef.current = lenis;

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    // Disable pinch-to-zoom
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    // Disable double-tap zoom
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      lenis.destroy();
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("popstate", handlePopState);
      window.history.back = origBack;
      window.history.forward = origForward;
      window.history.go = origGo;
    };
  }, []);

  // Block right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Block DevTools shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey &&
          e.shiftKey &&
          ["i", "j", "c"].includes(e.key.toLowerCase())) ||
        e.key === "F12"
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Header />
      <Spinner />
      <main>{children}</main>
    </>
  );
}
