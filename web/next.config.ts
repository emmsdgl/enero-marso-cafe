import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.13"],
  webpack: (config, { dev }) => {
    // 32-bit Node on this machine caps memory near 2 GB; webpack's persistent dev cache
    // overflows it ("Array buffer allocation failed"). Keep the cache in memory only.
    if (dev) config.cache = { type: "memory" };
    return config;
  },
};

export default nextConfig;
