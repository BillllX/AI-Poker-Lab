import type { Metadata } from "next";
import { hreflangForPath } from "./hreflangAlternates";
import { absoluteUrl, getSiteOrigin } from "./siteUrl";

type PageMetadataInput = {
  description: string;
  keywords?: string[];
  ogImagePath?: string;
  ogType?: "article" | "profile" | "website";
  path: string;
  robotsIndex?: boolean;
  title: string;
};

function ogImageUrl(path: string) {
  return `${getSiteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Shared SEO metadata with absolute canonical + OpenGraph URL. */
export function buildPageMetadata({
  path,
  title,
  description,
  keywords,
  ogImagePath = "/icon-512.png",
  ogType = "website",
  robotsIndex = true,
}: PageMetadataInput): Metadata {
  const { canonical, languages } = hreflangForPath(path);
  const ogImage = ogImageUrl(ogImagePath);

  return {
    title,
    description,
    keywords,
    alternates: { canonical, languages },
    robots: robotsIndex ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: ogType,
      title,
      description,
      url: canonical,
      alternateLocale: ["zh_CN"],
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
