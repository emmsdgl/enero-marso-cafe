import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.16"],
  // The QR reader for payment accounts: loaded from node_modules at run time, with its engine file
  serverExternalPackages: ["zxing-wasm"],
  outputFileTracingIncludes: { "/staff/branch": ["./node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"] },
  async headers() {
    return [
      // Every page: no framing by other sites (clickjacking), no type guessing, only the features we use
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
      // Push-to-talk needs the microphone. Browsers keep the policy of the first page loaded, and the
      // staff app and sign-in move between screens without reloading, so all of them allow it.
      // Listed after the rule above, so this Permissions-Policy wins on these pages.
      ...["/staff/:path*", "/kiosk/:path*", "/login/:path*"].map((source) => ({
        source,
        headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(self), payment=(), geolocation=(self)" }],
      })),
      // A customer's order link carries their private token: never pass it on, never index it.
      // Listed after the rule above, so its Referrer-Policy wins for order pages.
      {
        source: "/order/:code",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      // The staff app's service worker: phones check for a new version on every visit
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      { source: "/staff.webmanifest", headers: [{ key: "Content-Type", value: "application/manifest+json" }] },
      { source: "/kiosk.webmanifest", headers: [{ key: "Content-Type", value: "application/manifest+json" }] },
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
