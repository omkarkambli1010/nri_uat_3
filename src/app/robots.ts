import type { MetadataRoute } from "next";
import {
  PUBLIC_ROUTES,
  SITE_URL,
  canonicalUrl,
  isIndexableEnvironment,
} from "@/lib/seo";

/**
 * Generates /robots.txt.
 *
 * basePath: this app is served under `/diynri`, so Next emits this file at
 * `/diynri/robots.txt`. Crawlers only ever read `<origin>/robots.txt`, but the
 * `beforeFiles` rewrite in next.config.ts maps root-level `.txt`/`.xml`
 * requests into `/diynri/...`, so both `/robots.txt` and `/sitemap.xml`
 * resolve. Check that rewrite still exists before changing it.
 */

// Rules are written against origin-relative paths including the basePath,
// because that is the prefix crawlers actually request.
const basePath = new URL(SITE_URL).pathname.replace(/\/$/, "");
const withBase = (path: string) => `${basePath}/${path.replace(/^\//, "")}`;

export default function robots(): MetadataRoute.Robots {
  // Block the whole app on UAT and any non-production build, so the staging
  // host can never be indexed alongside production.
  if (!isIndexableEnvironment) {
    return { rules: [{ userAgent: "*", disallow: withBase("") }] };
  }

  return {
    rules: [
      {
        // Applies to Googlebot, Bingbot and every other crawler.
        userAgent: "*",
        // Deny-by-default, mirroring the noindex default in the root layout:
        // only the public marketing pages are crawlable, and every onboarding
        // step — current or added later — is blocked without needing to be
        // listed. Per the robots.txt spec the longest matching path wins, so
        // the specific Allow lines beat the broad Disallow. Allow is listed
        // first so that simpler first-match crawlers also read it correctly.
        allow: PUBLIC_ROUTES.map((route) => withBase(route)),
        // Scoped to the basePath, NOT "/": this file is served at the host
        // root, and other apps share this host (e.g. /open-demat-account).
        // A bare "Disallow: /" would deindex them too.
        disallow: withBase(""),
      },
    ],
    sitemap: canonicalUrl("sitemap.xml"),
    host: new URL(SITE_URL).origin,
  };
}
