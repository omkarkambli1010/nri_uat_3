import { environment, currentEnvironment } from "@/environments/environment";

/**
 * Central SEO policy for the app.
 *
 * This is an onboarding/KYC funnel, not a content site: only the two public
 * marketing pages are indexable. Every other route (document upload, selfie,
 * bank details, e-sign, OTP, thank-you screens) is thin, near-duplicate, or
 * session-scoped and would dilute ranking if crawled — so the root layout
 * defaults to noindex and the pages below opt back in.
 */

/**
 * Only the real production host may be indexed. UAT (udn.sbisecurities.in)
 * serves the same pages, so letting it into the index would compete with
 * production for the same queries.
 */
export const isIndexableEnvironment = currentEnvironment === "production";

/**
 * Absolute origin + basePath, always with a trailing slash.
 *
 * The trailing slash matters: canonical URLs are built with `new URL(path,
 * SITE_URL)` and a leading slash on `path` would discard the `/diynri` prefix.
 * Paths passed to `canonicalUrl` are therefore relative (no leading slash).
 */
export const SITE_URL = environment.url.endsWith("/")
  ? environment.url
  : `${environment.url}/`;

/** Routes that search engines are allowed to crawl and index. */
export const PUBLIC_ROUTES = ["home", "faq"] as const;

/** Build an absolute canonical URL for a route (pass it without a leading slash). */
export function canonicalUrl(path: string): string {
  return new URL(path.replace(/^\//, ""), SITE_URL).toString();
}
