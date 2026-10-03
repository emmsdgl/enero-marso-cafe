import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

const passwordGate = auth.middleware({ loginUrl: "/login" });

/**
 * First gate for the staff area: no session, no entry. Employees who signed in with a PIN at the branch
 * carry a separate signed cookie; its signature, expiry and role are checked on every page and action.
 */
export default async function proxy(request: NextRequest) {
  if (request.cookies.has("em_pin_session")) return NextResponse.next();
  return passwordGate(request);
}

export const config = {
  matcher: ["/staff/:path*"],
};
