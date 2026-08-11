import "server-only";
import { env } from "./env";
import { AUTHOR_ALTERNATE_NAME, AUTHOR_PROFILES, site } from "./site";

/**
 * One name for the author, used by every page that mentions him.
 *
 * Without it each text carries its own `author: { name: "Titus Bihl" }`, and a
 * search engine sees a dozen unrelated people who happen to share a name — the
 * exact ambiguity that matters most when the name is the search. Pointing all
 * of them at one `@id` says instead: the same person wrote all of these.
 *
 * The fragment hangs off the site root rather than off /ueber, so the
 * identifier survives that page being renamed or removed. It is an identifier,
 * not an address — nothing ever fetches it.
 */
export function authorId(): string {
  return `${env.siteUrl}/#person`;
}

/**
 * The author as a Person, defined once here and emitted on every page that
 * refers to him. Repeating the definition rather than referencing it from a
 * distance is deliberate: each page then stands on its own, and search engines
 * merge the copies on the shared `@id`.
 */
export function authorSchema() {
  const sameAs = AUTHOR_PROFILES.filter(Boolean);

  return {
    "@type": "Person",
    "@id": authorId(),
    name: site.name,
    alternateName: AUTHOR_ALTERNATE_NAME,
    jobTitle: site.role,
    description: `${site.name} — ${site.role}. ${site.tagline}.`,
    url: `${env.siteUrl}/ueber`,
    image: `${env.siteUrl}/img/titus-bihl.jpg`,
    // Omitted entirely while empty: an empty sameAs asserts nothing and reads
    // as an oversight to anyone inspecting the markup.
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}
