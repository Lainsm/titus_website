import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { site } from "@/lib/site";
import "./globals.css";
import "./patterns.css";

/*
 * Fonts are stored in /public/fonts and served from our own domain — no
 * request ever leaves for Google. Both are variable fonts, so one file each
 * covers every weight.
 */
const inter = localFont({
  src: [
    { path: "../../public/fonts/inter-latin.woff2", style: "normal" },
    { path: "../../public/fonts/inter-latin-ext.woff2", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
});

const sourceSerif = localFont({
  src: [
    { path: "../../public/fonts/serif-latin.woff2", style: "normal" },
    { path: "../../public/fonts/serif-latin-ext.woff2", style: "normal" },
    { path: "../../public/fonts/serif-italic-latin.woff2", style: "italic" },
    {
      path: "../../public/fonts/serif-italic-latin-ext.woff2",
      style: "italic",
    },
  ],
  variable: "--font-source-serif",
  display: "swap",
  weight: "200 900",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    locale: "de_CH",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // lang="de-CH" drives the hyphenation dictionary and Swiss quote marks.
    <html lang="de-CH" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>
        <a className="skip-link" href="#inhalt">
          Zum Inhalt springen
        </a>

        <header className="site-header">
          <div className="container site-header__inner">
            <Link href="/" className="wordmark">
              {site.name}
            </Link>
            <SiteNav />
          </div>
        </header>

        {/*
          Every page is one vertical stack on the section rhythm. It lives here
          so no page restates it and the gap is identical on every route.
        */}
        {/*
          tabIndex={-1} so the skip link actually moves focus here rather than
          only setting the scroll position — several browsers do the latter and
          leave the screen reader's cursor at the top of the document. The
          landing offset under the sticky header is handled by
          `scroll-padding-top` on <html>.
        */}
        <main id="inhalt" className="site-main" tabIndex={-1}>
          <div className="container">
            <div className="stack">{children}</div>
          </div>
        </main>

        {/*
          One line, the way lazare.studio does it: the reading paths already
          live in the header, so the footer carries only what has nowhere else
          to go — links at one end, the copyright at the other. Labelled,
          because an unnamed <nav> here would announce identically to the one
          in the header.
        */}
        <footer className="site-footer">
          <div className="container site-footer__inner">
            <nav className="site-footer__nav" aria-label="Fusszeile">
              <Link href="/kontakt">Kontakt</Link>
              <Link href="/newsletter">Newsletter</Link>
              <Link href="/impressum">Impressum</Link>
              <Link href="/datenschutz">Datenschutz</Link>
              <a href="/feed.xml">RSS</a>
            </nav>

            <p className="site-footer__colophon">
              <span>
                © {new Date().getFullYear()} {site.name}
              </span>
              <span>Gestaltet und gehostet in der Schweiz</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
