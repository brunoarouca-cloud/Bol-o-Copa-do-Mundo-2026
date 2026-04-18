import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
