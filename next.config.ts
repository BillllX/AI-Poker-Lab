import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
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

export default nextConfig;
