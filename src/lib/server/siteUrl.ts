import { getBasePath } from "@/lib/client/basePath";

/** Absolute site origin including basePath (no trailing slash). */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const basePath = getBasePath();
  if (process.env.NODE_ENV === "production") {
    return `https://aiagentswitcher.com${basePath || "/aipokerclub"}`;
  }

  const port = process.env.PORT?.trim() || "3000";
  return `http://localhost:${port}${basePath}`;
}

/** Build absolute URL for a public app route (path without basePath prefix). */
export function absoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  if (!path || path === "/") {
    return origin;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
