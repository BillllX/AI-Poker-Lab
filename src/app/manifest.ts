import type { MetadataRoute } from "next";

function assetPath(path: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Poker Lab",
    short_name: "AI Poker",
    description: "Train AI poker players in a no-deposit lab with rewards and live tables",
    start_url: assetPath("/"),
    display: "standalone",
    background_color: "#06130d",
    theme_color: "#0f2f22",
    icons: [
      {
        src: assetPath("/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: assetPath("/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
