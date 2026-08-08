import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterBlock } from "@/components/newsletter-block";
import { PostIndex } from "@/components/post-index";
import {
  categoryCounts,
  countPublishedPosts,
  listPublishedPosts,
} from "@/lib/content";
import { CATEGORY_KEYS, categoryPlural } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Texte",
  description:
    "Alle Erzählungen, Essays, Kommentare und Notizen — chronologisch geordnet.",
};

export default async function TextePage({
  searchParams,
}: {
  searchParams: Promise<{ kategorie?: string }>;
}) {
  const { kategorie } = await searchParams;
  const active =
    kategorie && CATEGORY_KEYS.includes(kategorie as never)
      ? kategorie
      : undefined;

  const [posts, counts, total] = await Promise.all([
    listPublishedPosts({ category: active, limit: 200 }),
    categoryCounts(),
    countPublishedPosts(),
  ]);

  return (
    <>
      <section className="container section--tight" style={{ paddingTop: "var(--space-16)" }}>
        <div className="section-head">
          <p className="section-head__label label">Register</p>
          <h1 className="section-head__title">
            {active ? categoryPlural(active) : "Alle Texte"}
          </h1>
          <p className="section-head__aside">
            {posts.length} von {total}
          </p>
        </div>

        <nav className="filters" aria-label="Nach Gattung filtern">
          <Link href="/texte" aria-current={!active ? "true" : undefined}>
            Alle
            <span className="filters__count">{total}</span>
          </Link>
          {CATEGORY_KEYS.filter((key) => (counts[key] ?? 0) > 0).map((key) => (
            <Link
              key={key}
              href={`/texte?kategorie=${key}`}
              aria-current={active === key ? "true" : undefined}
            >
              {categoryPlural(key)}
              <span className="filters__count">{counts[key]}</span>
            </Link>
          ))}
        </nav>

        {posts.length > 0 ? (
          <PostIndex posts={posts} />
        ) : (
          <p className="empty">
            In dieser Gattung ist noch nichts erschienen.
          </p>
        )}
      </section>

      <NewsletterBlock />
    </>
  );
}
