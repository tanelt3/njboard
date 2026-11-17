import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local preview and hot reload on this development machine's LAN address.
  allowedDevOrigins: ["127.0.0.1", "192.168.1.160"],
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
