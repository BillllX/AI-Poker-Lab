import { buildBreadcrumbListJsonLd, type BreadcrumbItem } from "@/lib/server/breadcrumbJsonLd";

type BreadcrumbJsonLdProps = {
  items: BreadcrumbItem[];
};

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  if (items.length < 2) {
    return null;
  }

  const payload = buildBreadcrumbListJsonLd(items);

  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
      type="application/ld+json"
    />
  );
}
