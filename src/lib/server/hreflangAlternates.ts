import { absoluteUrl } from "./siteUrl";

export type HreflangAlternates = {
  canonical: string;
  languages: Record<string, string>;
};

/** en + zh-Hans hreflang pair for a public route (client i18n via ?lang=). */
export function hreflangForPath(path: string): HreflangAlternates {
  const canonical = absoluteUrl(path);
  return {
    canonical,
    languages: {
      en: canonical,
      "zh-Hans": withLangQuery(canonical, "zh-Hans"),
      "x-default": canonical,
    },
  };
}

function withLangQuery(url: string, lang: string) {
  const parsed = new URL(url);
  parsed.searchParams.set("lang", lang);
  return parsed.toString();
}
