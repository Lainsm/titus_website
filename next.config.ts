import type { NextConfig } from "next";

/*
 * Server Actions are rejected unless the request's Origin matches the Host (or
 * X-Forwarded-Host). Behind Infomaniak's reverse proxy the host Next sees is
 * not always the one the browser addressed, and a mismatch fails closed — the
 * form simply stops working. Naming the public host here is what keeps the
 * CSRF check strict AND correct; leaving it unset and hoping is how people end
 * up disabling the check instead.
 */
const allowedOrigins = (() => {
  const url = process.env.SITE_URL;
  if (!url) return undefined;
  try {
    const { host } = new URL(url);
    /*
     * Both spellings of the domain. SITE_URL names one of them — say
     * www.bihl.ch — but a visitor who types bihl.ch arrives with that Origin,
     * and the CSRF check compares the two literally. Listing only the
     * configured host means every form on the apex domain fails with an
     * error that looks nothing like a redirect problem.
     */
    const counterpart = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    return [...new Set([host, counterpart])];
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  // Produces .next/standalone — a self-contained Node server for Infomaniak.
  output: "standalone",
  // `mysql2` and `nodemailer` must stay external (native/dynamic requires).
  serverExternalPackages: ["mysql2", "nodemailer"],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      ...(allowedOrigins ? { allowedOrigins } : {}),
      // Nothing here uploads a file; the smaller ceiling is a cheaper request
      // to reject. The contact form's own cap is 5 000 characters.
      bodySizeLimit: "256kb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Superseded by CSP frame-ancestors, kept for older browsers.
          { key: "X-Frame-Options", value: "DENY" },
          /*
           * The site asks for no device capability at all, so deny the lot.
           * A future embed that needs one should have to add it here.
           */
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          /*
           * Two years, subdomains included. Only ever sent over HTTPS, so a
           * local http:// run is unaffected. Note this is a commitment: once a
           * browser has seen it, that domain is HTTPS-only for the duration,
           * so it should go live only when the certificate is in place —
           * which on Infomaniak it is, before the domain is public.
           */
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // The portrait is content-addressed by name only, so a shorter life.
        source: "/img/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800" },
        ],
      },
      {
        // Never let a proxy or browser hold on to an admin page.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
