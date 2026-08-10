"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/texte", label: "Texte" },
  { href: "/publikationen", label: "Publikationen" },
  { href: "/ueber", label: "Über" },
  { href: "/newsletter", label: "Newsletter" },
];

/*
 * The width at which the five links fit beside the wordmark again. It has to
 * be written twice — once here and once in globals.css — because a custom
 * property cannot be used in a media query, so there is no single token to
 * point both at. The CSS side decides which of the two navigations is drawn;
 * this side only closes the sheet when the viewport grows past it, which a
 * phone turned sideways does. Without that, the sheet would stay in the top
 * layer holding the page inert behind a menu that is no longer wanted.
 */
const NAV_FITS_INLINE = "(min-width: 40rem)";

// "/" is a prefix of every route, so it only ever matches exactly.
function isActive(href: string, pathname: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  /*
   * Tapping a link closes the sheet on the way out, so this is only the
   * backstop for the browser's own back and forward — the one way the route
   * can change while the sheet is up. Closing an already-closed dialog is a
   * no-op and fires no event, so the run on mount costs nothing.
   */
  useEffect(() => {
    sheet.current?.close();
  }, [pathname]);

  useEffect(() => {
    const fits = window.matchMedia(NAV_FITS_INLINE);
    const dismiss = () => {
      if (fits.matches) sheet.current?.close();
    };
    fits.addEventListener("change", dismiss);
    return () => fits.removeEventListener("change", dismiss);
  }, []);

  const links = LINKS.map((link) => ({
    ...link,
    current: isActive(link.href, pathname),
  }));

  return (
    <>
      <nav className="site-nav" aria-label="Hauptnavigation">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.current ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="nav-toggle"
        aria-label="Menü öffnen"
        aria-expanded={open}
        aria-controls="hauptmenue"
        onClick={() => {
          sheet.current?.showModal();
          setOpen(true);
        }}
      >
        <span className="nav-toggle__bars" aria-hidden="true" />
      </button>

      {/*
        A real <dialog> rather than a div with a z-index. showModal() puts it
        in the top layer — above the sticky header without joining the site's
        z-index scale — and hands us the three things a hand-rolled overlay
        has to reimplement badly: the rest of the document goes inert, Tab
        cycles inside the sheet, and Escape closes it. Closing also returns
        focus to whatever opened it, which is the burger.

        onClose is the single place `open` comes back down, because Escape and
        the button and a link all arrive through it.
      */}
      <dialog
        id="hauptmenue"
        className="nav-sheet"
        ref={sheet}
        aria-label="Hauptmenü"
        onClose={() => setOpen(false)}
      >
        {/*
          The same two classes the real header uses, so the wordmark lands on
          the exact pixel it already occupies and the burger appears to become
          the cross rather than the page appearing to jump.
        */}
        <div className="container site-header__inner">
          <Link
            href="/"
            className="wordmark"
            onClick={() => sheet.current?.close()}
          >
            {site.name}
          </Link>

          <button
            type="button"
            className="nav-toggle"
            aria-label="Menü schliessen"
            onClick={() => sheet.current?.close()}
          >
            <span className="nav-toggle__cross" aria-hidden="true" />
          </button>
        </div>

        {/*
          Labelled the same as the header's nav on purpose: it is the same
          navigation in its other form. Only ever one of the two is in the
          accessibility tree, since the other is display:none — a closed
          dialog below 40rem, the header's own nav above it.
        */}
        <nav className="container nav-sheet__nav" aria-label="Hauptnavigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.current ? "page" : undefined}
              onClick={() => sheet.current?.close()}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </dialog>
    </>
  );
}
