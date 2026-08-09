import { getPage } from "@/lib/content";
import { refineHtml } from "@/lib/typography";

export type Portrait = {
  src: string;
  /** Describes the photograph, not the file — a reader who cannot see it
      should learn what it shows, not that it exists. */
  alt: string;
};

/**
 * Renders one of the editable standing pages (Über, Impressum, Datenschutz).
 * If the author hasn't written it yet, the fallback is shown instead of an
 * empty page — the site is never broken by a missing row.
 */
export async function StandingPage({
  slug,
  title,
  fallbackHtml,
  portrait,
}: {
  slug: string;
  title: string;
  fallbackHtml: string;
  portrait?: Portrait;
}) {
  const page = await getPage(slug);
  const html = page?.body_html?.trim() ? page.body_html : fallbackHtml;

  return (
    <div className="simple-page">
      <div className="simple-page__aside">
        <h1 className="simple-page__title">{page?.title || title}</h1>

        {/*
          A plain <img>, no <figure>: with no caption there is nothing for a
          figure to associate, and the alt text already says who this is. The
          file is cropped square and sized for its slot, so next/image would
          only add a runtime dependency to the standalone build. Dimensions
          are stated so the square is reserved before it loads.
        */}
        {portrait && (
          <img
            className="portrait"
            src={portrait.src}
            alt={portrait.alt}
            width={1400}
            height={1400}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

      <div
        className="prose simple-page__body"
        dangerouslySetInnerHTML={{ __html: refineHtml(html) }}
      />
    </div>
  );
}
