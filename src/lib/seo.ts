import { environment, currentEnvironment } from "@/environments/environment";
export const isIndexableEnvironment = currentEnvironment === "production";

export const SITE_URL = environment.url.endsWith("/")
  ? environment.url
  : `${environment.url}/`;

export const PUBLIC_ROUTES = ["home", "faq"] as const;

export function canonicalUrl(path: string): string {
  return new URL(path.replace(/^\//, ""), SITE_URL).toString();
}
