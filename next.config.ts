import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  basePath,
  // Subpath deploys (/aipokerclub, /aipokerclubtest): default image optimizer 400s on /public webp.
  images: {
    unoptimized: Boolean(basePath),
  },
  outputFileTracingRoot: projectRoot,
  async redirects() {
    return [
      {
        source: "/journey.html",
        destination: "/journey",
        permanent: true,
      },
    ];
  },
};

function withOptionalBundleAnalyzer(config: NextConfig): NextConfig {
  if (process.env.ANALYZE !== "true") {
    return config;
  }

  // Only required locally when running ANALYZE=true npm run build
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bundleAnalyzer = require("@next/bundle-analyzer") as (options: {
    enabled: boolean;
  }) => (nextConfig: NextConfig) => NextConfig;

  return bundleAnalyzer({ enabled: true })(config);
}

export default withOptionalBundleAnalyzer(nextConfig);
