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
    { path: "../../public/fonts/serif-italic-latin-ext.woff2", style: "italic" },
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
              <span className="wordmark__name">{site.name}</span>
              <span className="wordmark__role">{site.role}</span>
            </Link>
            <SiteNav />
          </div>
        </header>

        <main id="inhalt" className="site-main">
          {children}
        </main>

        <footer className="site-footer">
          <div className="container">
            <div className="site-footer__grid">
              <div className="site-footer__block">
                <p className="label label--ink">{site.name}</p>
                <p
                  style={{
                    marginTop: "var(--space-3)",
                    color: "var(--ink-muted)",
                    maxWidth: "24em",
                  }}
                >
                  {site.tagline}
                </p>
              </div>

              <div className="site-footer__block">
                <p className="label">Lesen</p>
                <nav className="site-footer__links">
                  <Link href="/texte">Alle Texte</Link>
                  <Link href="/publikationen">Publikationen</Link>
                  <Link href="/ueber">Über den Autor</Link>
                  <a href="/feed.xml">RSS-Feed</a>
                </nav>
              </div>

              <div className="site-footer__block">
                <p className="label">Kontakt</p>
                <nav className="site-footer__links">
                  <Link href="/newsletter">Newsletter</Link>
                  <Link href="/impressum">Impressum</Link>
                  <Link href="/datenschutz">Datenschutz</Link>
                </nav>
              </div>
            </div>

            <div className="site-footer__colophon">
              <span>
                © {new Date().getFullYear()} {site.name}
              </span>
              <span>Gestaltet und gehostet in der Schweiz</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
