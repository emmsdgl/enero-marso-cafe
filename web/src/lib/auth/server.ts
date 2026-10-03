import { createNeonAuth } from "@neondatabase/auth/next/server";

/** Neon Auth (Managed Better Auth). Users and sessions live in the branch's `neon_auth` schema. */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
