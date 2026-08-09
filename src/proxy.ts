import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Two jobs, in this order: put a Content-Security-Policy on every document,
 * and turn away admin requests that carry no session cookie at all.
 *
 * The admin gate is optimistic only. It never renders an admin page for a
 * stranger, but it does NOT validate the session — that happens in the (app)
 * layout and again in every Server Action, which is what actually protects the
 * data. A cookie named titus_session containing rubbish gets past this and
 * nowhere further.
 *
 * (In Next.js 16 this file is `proxy.ts`; it was called `middleware.ts` before.)
 */

function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  /*
   * Nonce-based rather than 'unsafe-inline': Next.js stamps this nonce onto
   * the inline bootstrap and flight-data scripts it emits, so an injected
   * <script> that cannot guess it never runs. The nonce is fresh per request,
   * which is why every matched route has to render dynamically.
   *
   * 'strict-dynamic' lets those trusted scripts load the chunks they need
   * without listing each one. In development React uses eval() to rebuild
   * server stack traces, so 'unsafe-eval' is added there and only there.
   *
   * The site loads nothing from anywhere else — fonts, styles and the one
   * photograph are all served from this origin — so 'self' is the whole
   * allowlist. data: covers the grain SVG and the favicon's embedded PNG.
   */
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!request.cookies.has("titus_session")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  // Next reads the nonce back off the request headers to stamp its own tags.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Every document, and nothing that is served straight off disk. Static
     * assets need no nonce, and matching them would only add a hop and defeat
     * their immutable caching.
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|fonts/|img/|feed.xml|robots.txt|sitemap.xml).*)",
    },
  ],
};
