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

const basePath = new URL(SITE_URL).pathname.replace(/\/$/, "");
const withBase = (path: string) => `${basePath}/${path.replace(/^\//, "")}`;

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableEnvironment) {
    return { rules: [{ userAgent: "*", disallow: withBase("") }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_ROUTES.map((route) => withBase(route)),
        disallow: withBase(""),
      },
    ],
    sitemap: canonicalUrl("sitemap.xml"),
    host: new URL(SITE_URL).origin,
  };
}
