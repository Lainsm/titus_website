/**
 * Everything that is specific to the author lives here, so the site can be
 * re-titled without touching any component.
 */
export const site = {
  name: "Titus Bihl",
  role: "Arzt und Autor",
  tagline: "Erzählungen, Essays und Kommentare",
  description:
    "Erzählungen, Essays und Kommentare von Titus Bihl, Arzt und Autor.",
  locale: "de-CH",
  place: "Schweiz",
  /* Where the contact form delivers. Shown on the page too, so someone can
     write from their own client instead of using the form. */
  email: "titus@bihl.ch",
} as const;

export const CATEGORIES = {
  erzaehlung: { singular: "Erzählung", plural: "Erzählungen" },
  essay: { singular: "Essay", plural: "Essays" },
  kommentar: { singular: "Kommentar", plural: "Kommentare" },
  notiz: { singular: "Notiz", plural: "Notizen" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export function categoryLabel(key: string): string {
  return CATEGORIES[key as CategoryKey]?.singular ?? key;
}

export function categoryPlural(key: string): string {
  return CATEGORIES[key as CategoryKey]?.plural ?? key;
}

export const PUBLICATION_KINDS = {
  buch: "Buch",
  beitrag: "Beitrag",
  artikel: "Artikel",
  vortrag: "Vortrag",
} as const;

export type PublicationKind = keyof typeof PUBLICATION_KINDS;

/** Swiss German date: 8. August 2026 */
export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Compact form for lists: 08.08.2026 */
export function formatDateShort(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
