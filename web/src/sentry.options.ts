/**
 * Shared Sentry settings for the browser, server and edge. Errors only: no performance tracing
 * (stays inside the free plan) and no personal data such as IP addresses or cookies, because
 * order pages carry customers' names, phones and addresses.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0,
  sendDefaultPii: false,
};
