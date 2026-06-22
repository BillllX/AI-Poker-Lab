/** Responsive `sizes` hints for public / next/image assets (WCAG + LCP tuning). */
export const imageSizes = {
  /** Homepage hero — full bleed up to 1360px container. */
  homeHero: "(max-width: 640px) 100vw, 1360px",
  /** Showcase player-card illustration — hidden on ≤640px. */
  homePlayerCard: "(max-width: 640px) 0px, (max-width: 1024px) 420px, 400px",
  /** Journey pixel-art panels inside 820px column. */
  journeyPixelArt: "(max-width: 820px) 100vw, 560px",
  /** Casino.org phone mockups. */
  casinoPhone: "(max-width: 640px) 292px, 315px",
} as const;

export type ImageSizesKey = keyof typeof imageSizes;
