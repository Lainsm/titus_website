import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic gate only: it turns away requests that carry no session cookie
 * at all, so the admin pages are never even rendered for a stranger. It does
 * NOT validate the session — that happens in the (app) layout and again in
 * every Server Action, which is what actually protects the data.
 *
 * (In Next.js 16 this file is `proxy.ts`; it was called `middleware.ts` before.)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  if (!request.cookies.has("titus_session")) {
    const url = new URL("/admin/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
