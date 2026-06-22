/**
 * Production mounts the app under NEXT_PUBLIC_BASE_PATH (e.g. /aipokerclub).
 * Use withBasePath for fetch, EventSource, and static asset URLs loaded at runtime.
 * Next.js Link / router.push use app-relative paths without the prefix.
 */
export function getBasePath() {
  const trimmed = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  if (!trimmed || trimmed === "/") {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed.replace(/\/$/, "") : `/${trimmed.replace(/\/$/, "")}`;
}

export function withBasePath(path: string) {
  const basePath = getBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}` || "/";
}

/** Runtime URL for files in /public (img, CSS background, audio). Prefer WebP when a PNG source exists. */
export function publicAssetUrl(path: string, options?: { format?: "webp" | "original" }) {
  let normalized = path.startsWith("/") ? path : `/${path}`;
  if ((options?.format ?? "webp") === "webp" && /\.png$/i.test(normalized)) {
    normalized = normalized.replace(/\.png$/i, ".webp");
  }
  return withBasePath(normalized);
}

/** CSS `url(...)` value for a public asset background. */
export function publicAssetBackground(path: string) {
  return `url(${publicAssetUrl(path)})`;
}
