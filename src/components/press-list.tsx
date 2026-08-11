import type { PressItem } from "@/lib/content";
import { PRESS_KINDS, type PressKind, formatDateShort } from "@/lib/site";
import { refine } from "@/lib/typography";

/**
 * Press coverage, at the foot of the Über page.
 *
 * It lives here rather than behind its own nav item on purpose: two or three
 * entries under a top-level tab reads as a thin room, while at the end of the
 * page about him they read as evidence for what the page just said. When the
 * list is long enough to carry a page of its own, it moves — the data and the
 * back office do not change, only where this component is rendered.
 *
 * Renders nothing at all while empty, rather than an empty heading.
 */
export function PressList({ items }: { items: PressItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="press" aria-labelledby="presse">
      <h2 className="press__heading" id="presse">
        Presse
      </h2>

      <div className="press__list">
        {items.map((item) => {
          // The archived copy is the fallback, not a second link: one address
          // per entry, and it is whichever one still resolves.
          const href = item.url || item.archive_url;

          return (
            <article className="press-item" key={item.id}>
              <div className="press-item__meta">
                <p className="label label--ink">
                  {PRESS_KINDS[item.kind as PressKind] ?? item.kind}
                </p>
                {item.published_at && (
                  <p className="label label--stacked">
                    <time dateTime={item.published_at}>
                      {formatDateShort(item.published_at)}
                    </time>
                  </p>
                )}
              </div>

              <div className="press-item__body">
                <p className="press-item__outlet label label--faint">
                  {item.outlet}
                  {item.language !== "de" && ` · ${item.language.toUpperCase()}`}
                </p>

                <h3 className="press-item__title">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {refine(item.title)}
                    </a>
                  ) : (
                    refine(item.title)
                  )}
                </h3>

                {item.quote && (
                  <blockquote className="press-item__quote">
                    {refine(item.quote)}
                  </blockquote>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
