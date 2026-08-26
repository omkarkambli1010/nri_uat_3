import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, canonicalUrl, isIndexableEnvironment } from "@/lib/seo";

/**
 * Generates /sitemap.xml from the same PUBLIC_ROUTES list that robots.ts
 * allow-lists, so the two cannot drift apart. A route added to PUBLIC_ROUTES
 * still needs to opt into `index` in its own page metadata.
 */
const ROUTE_METADATA: Record<
    (typeof PUBLIC_ROUTES)[number],
    { changeFrequency: "weekly" | "monthly"; priority: number }
> = {
    home: { changeFrequency: "weekly", priority: 1 },
    faq: { changeFrequency: "monthly", priority: 0.5 },
};

export default function sitemap(): MetadataRoute.Sitemap {
    if (!isIndexableEnvironment) {
        return [];
    }

    const lastModified = new Date();

    return PUBLIC_ROUTES.map((route) => ({
        url: canonicalUrl(route),
        lastModified,
        ...ROUTE_METADATA[route],
    }));
}
