import Link from "next/link";
import { NewsletterBlock } from "@/components/newsletter-block";
import { PostIndex } from "@/components/post-index";
import { countPublishedPosts, listPublishedPosts } from "@/lib/content";
import { categoryLabel, formatDate, site } from "@/lib/site";
import { excerptFrom, readingMinutes, refine } from "@/lib/typography";

// Content comes from Postgres and changes when the author publishes.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [posts, total] = await Promise.all([
    listPublishedPosts({ limit: 9 }),
    countPublishedPosts(),
  ]);

  const [featured, ...rest] = posts;

  return (
    <>
      <section className="container hero">
        <p className="label label--accent">{site.role}</p>
        <h1 className="hero__statement">
          Über das Erzählen, das Zweifeln und das, was <em>zwischen</em> den
          Diagnosen liegt.
        </h1>
        <div className="hero__meta">
          <span className="label">
            {total} {total === 1 ? "Text" : "Texte"}
          </span>
          <span className="label">Erzählung · Essay · Kommentar</span>
          <span className="label">{site.place}</span>
        </div>
      </section>

      {featured ? (
        <article className="container feature">
          <div className="feature__index">
            <p className="label label--ink">Zuletzt erschienen</p>
            <p className="label" style={{ marginTop: "var(--space-2)" }}>
              {formatDate(featured.published_at)}
            </p>
          </div>

          <div className="feature__body">
            <p className="label label--accent">
              {categoryLabel(featured.category)}
            </p>
            <h2 className="feature__title" style={{ marginTop: "var(--space-3)" }}>
              <Link href={`/texte/${featured.slug}`}>
                {refine(featured.title)}
              </Link>
            </h2>
            <p className="feature__lead">
              {refine(featured.lead || excerptFrom(featured.subtitle, 240))}
            </p>
            <div className="feature__cta">
              <Link href={`/texte/${featured.slug}`} className="button">
                Text lesen
              </Link>
              <span
                className="label"
                style={{ marginLeft: "var(--space-4)" }}
              >
                {readingMinutes(featured.word_count)} Min.
              </span>
            </div>
          </div>
        </article>
      ) : (
        <div className="container">
          <p className="empty">
            Hier erscheinen bald die ersten Texte. Schauen Sie wieder vorbei
            oder melden Sie sich für den Newsletter an.
          </p>
        </div>
      )}

      {rest.length > 0 && (
        <section className="container section">
          <div className="section-head">
            <p className="section-head__label label">Register</p>
            <h2 className="section-head__title">Weitere Texte</h2>
            <p className="section-head__aside">
              <Link href="/texte" style={{ textDecoration: "none" }}>
                Alle ansehen →
              </Link>
            </p>
          </div>
          <PostIndex posts={rest} startNumber={2} />
        </section>
      )}

      <NewsletterBlock />
    </>
  );
}
