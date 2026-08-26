"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { isPublicRoute } from "@/lib/auth-routes";
import { toast } from "@/services/toast.service";

const TOAST_OPTS = {
  position: "bottom-center" as const,
  autoClose: 2000,
};

const SESSION_EXPIRED_MESSAGE = "Your session has expired, please start again.";
const HOME_ROUTE = "/home";

// AuthGuard — equivalent to Angular's AuthGuard on the route config.
//
// Public routes (see auth-routes.ts) are resolved during render, so they still
// server-render their markup — '/home' is the one indexable page and must keep
// its SSR HTML.
//
// Guarded routes need the token, which lives in sessionStorage (see
// secure-session.service) and therefore can only be read in the browser. They
// render nothing until that check has run, so a protected page never flashes on
// screen before the redirect fires.
export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = isPublicRoute(pathname);
  // null = not checked yet on this client.
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  // React StrictMode re-runs effects in dev; without this the redirect toast
  // would appear twice for the same path.
  const warnedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPublic) return;

    const loggedIn = AuthService.isLoggedIn();
    // sessionStorage is unreadable during SSR and hydration, so this check has
    // to happen after mount — the follow-up render it triggers is the point,
    // not an accident.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthorized(loggedIn);
    if (loggedIn) return;

    if (warnedForRef.current !== pathname) {
      warnedForRef.current = pathname;
      toast.error(SESSION_EXPIRED_MESSAGE, TOAST_OPTS);
    }
    // replace(), not push() — the blocked route must not enter history, where
    // it would fight AppShell's back-button guard.
    router.replace(HOME_ROUTE);
  }, [pathname, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (authorized !== true) return null;

  return <>{children}</>;
}
