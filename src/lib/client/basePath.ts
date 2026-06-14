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
