import { getPage } from "@/lib/content";
import { refineHtml } from "@/lib/typography";

/**
 * Renders one of the editable standing pages (Über, Impressum, Datenschutz).
 * If the author hasn't written it yet, the fallback is shown instead of an
 * empty page — the site is never broken by a missing row.
 */
export async function StandingPage({
  slug,
  title,
  fallbackHtml,
}: {
  slug: string;
  title: string;
  fallbackHtml: string;
}) {
  const page = await getPage(slug);
  const html = page?.body_html?.trim() ? page.body_html : fallbackHtml;

  return (
    <div className="container simple-page">
      <h1 className="simple-page__title">{page?.title || title}</h1>
      <div
        className="prose simple-page__body"
        dangerouslySetInnerHTML={{ __html: refineHtml(html) }}
      />
    </div>
  );
}
