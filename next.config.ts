import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
