import Link from "next/link";
import type { PostSummary } from "@/lib/content";
import { categoryLabel, formatDateShort } from "@/lib/site";
import { readingMinutes, refine } from "@/lib/typography";

/**
 * The numbered register of texts — the central navigational device of the
 * site. Number, date and category sit in the left columns; the title and
 * teaser occupy the main measure.
 */
export function PostIndex({
  posts,
  startNumber = 1,
  showLead = true,
}: {
  posts: PostSummary[];
  startNumber?: number;
  showLead?: boolean;
}) {
  return (
    <ol className="index-list">
      {posts.map((post, i) => (
        <li key={post.id} className="index-item">
          <Link href={`/texte/${post.slug}`} className="index-item__link">
            <span className="index-item__number" aria-hidden="true">
              {String(startNumber + i).padStart(2, "0")}
            </span>

            <span className="index-item__meta">
              <span className="label">{categoryLabel(post.category)}</span>
              <span className="label" style={{ color: "var(--ink-faint)" }}>
                {formatDateShort(post.published_at)}
              </span>
            </span>

            <span className="index-item__main">
              <span className="index-item__title">{refine(post.title)}</span>
              {showLead && post.lead && (
                <span className="index-item__lead">{refine(post.lead)}</span>
              )}
              <span
                className="label"
                style={{
                  display: "block",
                  marginTop: "var(--space-3)",
                  color: "var(--ink-faint)",
                }}
              >
                {readingMinutes(post.word_count)} Min. Lesezeit
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
