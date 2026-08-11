import "server-only";
import { env } from "./env";
import type { PressItem } from "./content";
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
 *
 * `press` is the exception, and only /ueber passes it. What makes a page
 * self-sufficient is the identity — the @id, the name, the profiles that
 * corroborate it. Coverage *about* him is supplementary, and repeating a list
 * that grows without limit on every text would cost a database read per
 * article view to say something the entity already knows from one page.
 */
export function authorSchema(press: readonly PressItem[] = []) {
  const sameAs = AUTHOR_PROFILES.filter(Boolean);
  /*
   * `subjectOf`, not `sameAs`. An article about someone is not that someone,
   * and listing one as `sameAs` would state that the newspaper page and the
   * man are the same thing.
   */
  const subjectOf = press
    .filter((item) => item.url)
    .map((item) => ({
      "@type": "NewsArticle",
      headline: item.title,
      url: item.url,
      ...(item.published_at ? { datePublished: item.published_at } : {}),
      ...(item.outlet
        ? { publisher: { "@type": "Organization", name: item.outlet } }
        : {}),
    }));

  return {
    "@type": "Person",
    "@id": authorId(),
    name: site.name,
    alternateName: AUTHOR_ALTERNATE_NAME,
    jobTitle: site.role,
    description: `${site.name} - ${site.role}. ${site.tagline}.`,
    url: `${env.siteUrl}/ueber`,
    image: `${env.siteUrl}/img/titus-bihl.jpg`,
    // Omitted entirely while empty: an empty sameAs asserts nothing and reads
    // as an oversight to anyone inspecting the markup.
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(subjectOf.length > 0 ? { subjectOf } : {}),
  };
}
