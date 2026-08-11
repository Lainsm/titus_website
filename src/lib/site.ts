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

/**
 * Every other page on the web that *is* him: his own profiles and listings —
 * AdS, LinkedIn, a publisher's author page, a Wikidata entry.
 *
 * This is what lets a search engine collapse those into one person rather than
 * three coincidences, which is the entire difficulty a common first name
 * creates. It is also the one part of the markup that cannot be generated:
 * every entry has to be a page that genuinely is him.
 *
 * Press coverage does NOT belong here. An article *about* someone is not the
 * same thing as the someone, and putting one in `sameAs` states something
 * false. Schema.org's field for that relationship is `subjectOf`.
 */
export const AUTHOR_PROFILES: readonly string[] = [
  // The hospital he practises at — the most authoritative of these, and the
  // one a search engine is most likely to trust as a statement of identity.
  "https://www.h-fr.ch/annuaire/dr-titus-bihl-lainsbury",
  "https://www.onedoc.ch/fr/medecin-physique-readaptateur/fribourg/p7bk/dr-titus-bihl-lainsbury",
  "https://fr.comparis.ch/gesundheit/arzt/kanton-freiburg/fribourg/bihl-lainsbury-titus-7601000058386",
  // Author page at the Revue Médicale Suisse — and the one listing that spells
  // him the way this site does.
  "https://www.revmed.ch/auteurs/bihl-titus",
  "https://www.researchgate.net/profile/Titus-Bihl-Lainsbury",
  "https://independent.academia.edu/titusbihl",
  "https://ch.linkedin.com/in/titus-bihl-lainsbury-2837232b3",
];

/**
 * The other name he goes by professionally.
 *
 * This site calls him Titus Bihl. The hospital, OneDoc, Comparis, ResearchGate
 * and LinkedIn all call him Titus Bihl-Lainsbury. Both are him, and a search
 * engine has no way to know that: to it they are two similar strings attached
 * to two sets of pages, which is precisely the ambiguity that keeps a person
 * from resolving into one entity.
 *
 * `sameAs` above supplies the evidence; this states the claim outright.
 */
export const AUTHOR_ALTERNATE_NAME = "Titus Bihl-Lainsbury";

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
