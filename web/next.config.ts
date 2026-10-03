import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.13"],
  // Contact details now live on Our Stores
  async redirects() {
    return [{ source: "/contact", destination: "/store", permanent: true }];
  },
};

export default nextConfig;
