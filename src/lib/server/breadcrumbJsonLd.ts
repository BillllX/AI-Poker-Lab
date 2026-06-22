import { absoluteUrl } from "./siteUrl";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export const HOME_CRUMB: BreadcrumbItem = {
  name: "AI Poker Lab",
  path: "/",
};

export function breadcrumbTrail(...items: BreadcrumbItem[]): BreadcrumbItem[] {
  return [HOME_CRUMB, ...items];
}

export function buildBreadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
