import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { getNeighbours, getPublishedPost } from "@/lib/content";
import { env } from "@/lib/env";
import { authorId, authorSchema } from "@/lib/schema";
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

  /*
   * JSON-LD so search engines and readers-later apps understand the piece.
   *
   * Two things in one @graph rather than an Article alone: the piece, and the
   * person who wrote it. The author is a reference to the shared @id, not a
   * repeated name string — a name is a label that a dozen other people might
   * share, an @id is a claim that this is the same man each time. The Person
   * is defined here as well as on /ueber so the page stands on its own;
   * search engines merge the two on the identifier.
   */
  const url = `${env.siteUrl}/texte/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: post.title,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        inLanguage: "de-CH",
        author: { "@id": authorId() },
        description: post.lead || excerptFrom(post.body_html, 180),
        mainEntityOfPage: url,
        url,
      },
      authorSchema(),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />

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
