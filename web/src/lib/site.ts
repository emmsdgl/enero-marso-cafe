/**
 * The site's own address, for links that leave the site (emails, notifications). SITE_URL on the
 * live site (https://eneromarso.cafe once the domain is set up); preview deployments use their own
 * address; on a laptop it's localhost.
 */
export function siteUrl(): string {
  const set = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (set) return set;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
