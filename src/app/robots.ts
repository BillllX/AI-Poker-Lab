import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteOrigin } from "@/lib/server/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/login", "/me", "/dashboard", "/table"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
