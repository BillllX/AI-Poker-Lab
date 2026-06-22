import { publicAssetUrl } from "@/lib/client/basePath";

/** LCP hero image — publicAssetUrl resolves PNG → WebP when available. */
export const HOME_HERO_LCP_PATH = "/images/landing/texas-poker-club-hero.png";

export const HOME_HERO_LCP_WEBP_PATH = HOME_HERO_LCP_PATH.replace(/\.png$/i, ".webp");

export function homeHeroLcpUrl() {
  return publicAssetUrl(HOME_HERO_LCP_PATH);
}
