import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.13"],
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
