import { auth } from "@/lib/auth/server";

// First gate for the staff area: no session, no entry. Each page and action still checks the role itself.
export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: ["/staff/:path*"],
};
