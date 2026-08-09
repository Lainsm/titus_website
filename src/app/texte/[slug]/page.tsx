import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNeighbours, getPublishedPost } from "@/lib/content";
import { categoryLabel, formatDate, site } from "@/lib/site";
import {
  excerptFrom,
  readingMinutes,
  refine,
  refineHtml,
} from "@/lib/typography";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Nicht gefunden" };

  const description = post.lead || excerptFrom(post.body_html, 180);

  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.published_at ?? undefined,
      authors: [site.name],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const { older, newer } = await getNeighbours(post);

  // JSON-LD so search engines and readers-later apps understand the piece.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    inLanguage: "de-CH",
    author: { "@type": "Person", name: site.name },
    description: post.lead || excerptFrom(post.body_html, 180),
  };

  return (
    <>
      <script
        type="application/ld+json"
        /*
         * JSON.stringify is not enough on its own: it happily emits a literal
         * `</script>` inside a string, which closes this tag early and lets
         * everything after it parse as markup. A title is authored in the back
         * office rather than by the public, but "only an admin can reach it"
         * is an authorisation argument, not an escaping one — and this is the
         * one place on the site where a title is written into a script body.
         * Escaping < and & costs nothing and holds regardless.
         */
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
            .replace(/</g, "\\u003c")
            .replace(/&/g, "\\u0026")
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029"),
        }}
      />

      <article className="article">
        <header className="article__header">
          <div className="article__eyebrow">
            <p className="label label--accent">
              {categoryLabel(post.category)}
            </p>
          </div>

          <div className="article__titles">
            <h1 className="article__title">{refine(post.title)}</h1>
            {post.subtitle && (
              <p className="article__subtitle">{refine(post.subtitle)}</p>
            )}
          </div>

          <div className="article__facts">
            <span className="label">
              <time dateTime={post.published_at ?? undefined}>
                {formatDate(post.published_at)}
              </time>
            </span>
            <span className="label">
              {readingMinutes(post.word_count)} Min. Lesezeit
            </span>
            <span className="label">
              {post.word_count.toLocaleString("de-CH")} Wörter
            </span>
          </div>
        </header>

        <div className="article__body">
          {post.lead && (
            <p className="article__lead">{refine(post.lead)}</p>
          )}
          <div
            className="prose prose--lead article__prose"
            // Body HTML is sanitised on save (see lib/sanitize.ts) and
            // typographically refined here at render time.
            dangerouslySetInnerHTML={{ __html: refineHtml(post.body_html) }}
          />
        </div>

        <footer className="article__footer no-print">
          <p className="label">Weiterlesen</p>
          <div className="neighbours">
            {older ? (
              <Link href={`/texte/${older.slug}`} className="neighbour">
                <span className="label">← Älterer Text</span>
                <span className="neighbour__title">{refine(older.title)}</span>
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link
                href={`/texte/${newer.slug}`}
                className="neighbour neighbour--next"
              >
                <span className="label">Neuerer Text →</span>
                <span className="neighbour__title">{refine(newer.title)}</span>
              </Link>
            ) : (
              <span />
            )}
          </div>

          <p className="article__back">
            <Link href="/texte" className="button button--ghost">
              Zum Register
            </Link>
          </p>
        </footer>
      </article>
    </>
  );
}
