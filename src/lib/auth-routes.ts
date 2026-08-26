// auth-routes.ts — the bypass list for AuthGuard.
//
// Every route in the app requires a session token EXCEPT the ones listed here.

// Matched exactly. '/' redirects to '/home', '/home' is where the mobile number
// is entered and the OTP is requested, and '/mobile-home-otp' verifies it and
// issues the token — guarding any of the three would leave a fresh visitor with
// no way into the journey.
export const PUBLIC_ROUTES = [
  "/",
  "/home",
  "/mobile-home-otp",
  "/email",
  "/faq",
  "/page-not-found",
] as const;

// Matched as whole subtrees: the route itself and anything beneath it.
// '/aadhar' therefore also covers '/aadhar/upload'.
export const PUBLIC_ROUTE_TREES = ["/aadhar"] as const;

// Strips the trailing slash so '/home/' matches '/home'. usePathname() already
// returns the path without basePath, so nothing else needs normalising.
function normalise(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isPublicRoute(pathname: string): boolean {
  const path = normalise(pathname);

  if (PUBLIC_ROUTES.some((route) => route === path)) {
    return true;
  }

  // The '/' guards the boundary: '/aadhar' must not match '/aadharsomething'.
  return PUBLIC_ROUTE_TREES.some(
    (root) => path === root || path.startsWith(`${root}/`),
  );
}
