import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["ik.imagekit.io"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
