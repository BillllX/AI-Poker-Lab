import { imageSizes } from "@/lib/client/imageSizes";
import { homeHeroLcpUrl } from "@/lib/homeHeroLcp";

/** Preload homepage hero WebP for faster LCP (hoisted to document head). */
export function HeroLcpPreload() {
  return (
    <link
      as="image"
      fetchPriority="high"
      href={homeHeroLcpUrl()}
      imageSizes={imageSizes.homeHero}
      rel="preload"
      type="image/webp"
    />
  );
}
