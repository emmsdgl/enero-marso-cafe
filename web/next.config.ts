import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.13"],
  // A customer's order link carries their private token: never pass it on, never index it
  async headers() {
    return [
      {
        source: "/order/:code",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  // Contact details now live on Our Stores
  async redirects() {
    return [
      { source: "/contact", destination: "/store", permanent: true },
      // The gallery page was replaced by reservations and catering
      { source: "/gallery", destination: "/reservations", permanent: true },
    ];
  },
};

// Error alerts stay off until NEXT_PUBLIC_SENTRY_DSN is set; source maps upload only with SENTRY_AUTH_TOKEN
const uploads = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !uploads },
  release: { create: uploads },
  silent: !process.env.CI,
  telemetry: false,
});
