import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/s/:slug*",
        destination: "/",
      },
      {
        source: "/p/:slug*",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
