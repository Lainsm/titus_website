"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/texte", label: "Texte" },
  { href: "/publikationen", label: "Publikationen" },
  { href: "/ueber", label: "Über" },
  { href: "/newsletter", label: "Newsletter" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Hauptnavigation">
      {LINKS.map((link) => {
        // "/" is a prefix of every route, so it only ever matches exactly.
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
