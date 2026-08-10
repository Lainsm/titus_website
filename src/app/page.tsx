import Link from "next/link";
import { listPublishedPosts, listPublications } from "@/lib/content";
import {
  categoryLabel,
  formatDate,
  formatDateShort,
  PUBLICATION_KINDS,
  type PublicationKind,
} from "@/lib/site";
import { excerptFrom, readingMinutes, refine } from "@/lib/typography";

// Content comes from Postgres and changes when the author publishes.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [posts, publications] = await Promise.all([
    listPublishedPosts({ limit: 9 }),
    listPublications(),
  ]);

  const [featured, ...rest] = posts;

  return (
    <>
      {/*
        Swiss split, and the masthead sits inside the left column rather than
        above the whole page — that is what lets the registers start level with
        it at the top right instead of a third of the way down. If a picture
        ever goes on this page, the head of the left column is where it lands.
      */}
      <div className="split">
        <div className="split__main">
          <section className="masthead">
            <h1 className="masthead__statement">
              Über das Erzählen, das Zweifeln und das, was <em>zwischen</em> den
              Diagnosen liegt.
            </h1>
          </section>

          {featured ? (
            <article className="lead">
              <p className="label label--accent">Zuletzt erschienen</p>
              <h2 className="lead__title">
                <Link href={`/texte/${featured.slug}`}>
                  {refine(featured.title)}
                </Link>
              </h2>
              {(featured.lead || featured.subtitle) && (
                <p className="lead__summary">
                  {refine(featured.lead || excerptFrom(featured.subtitle, 320))}
                </p>
              )}
              <p className="lead__meta">
                <span className="label">
                  {categoryLabel(featured.category)}
                </span>
                <span className="label label--faint">
                  {formatDate(featured.published_at)}
                </span>
                <span className="label label--faint">
                  {readingMinutes(featured.word_count)} Min.
                </span>
              </p>
              <p className="lead__cta">
                <Link href={`/texte/${featured.slug}`} className="button">
                  Text lesen
                </Link>
              </p>
            </article>
          ) : (
            <p className="empty">
              Hier erscheinen bald die ersten Texte. Schauen Sie wieder vorbei
              oder melden Sie sich für den Newsletter an.
            </p>
          )}
        </div>

        <aside className="split__side">
          {rest.length > 0 && (
            <section className="register">
              <div className="register__head">
                <h2 className="register__title">Weitere Texte</h2>
                <Link className="register__all" href="/texte">
                  Alle ansehen →
                </Link>
              </div>
              {/* See post-index.tsx: `list-style: none` costs list semantics
                  in Safari unless the role is restated. */}
              <ol className="register__list" role="list">
                {rest.map((post) => (
                  <li key={post.id} className="register__item">
                    <Link
                      href={`/texte/${post.slug}`}
                      className="register__link"
                    >
                      <span className="register__body">
                        <span className="register__name">
                          {refine(post.title)}
                        </span>
                        <span className="label label--faint register__facts">
                          {categoryLabel(post.category)} ·{" "}
                          {formatDateShort(post.published_at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {publications.length > 0 && (
            <section className="register">
              <div className="register__head">
                <h2 className="register__title">Publikationen</h2>
                <Link className="register__all" href="/publikationen">
                  Alle ansehen →
                </Link>
              </div>
              <ol className="register__list" role="list">
                {publications.slice(0, 5).map((publication) => (
                  <li key={publication.id} className="register__item">
                    <span className="register__link register__link--static">
                      <span className="register__body">
                        <span className="register__name">
                          {refine(publication.title)}
                        </span>
                        {/*
                          Kind, imprint and year on one line, the same shape
                          the texts above use (kind · … · date) — which is what
                          lets both registers start flush at the same edge
                          instead of one of them reserving a year column.
                        */}
                        <span className="label label--faint register__facts">
                          {[
                            PUBLICATION_KINDS[
                              publication.kind as PublicationKind
                            ] ?? publication.kind,
                            publication.publisher,
                            publication.year,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
