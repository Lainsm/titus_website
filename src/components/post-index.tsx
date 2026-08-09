import Link from "next/link";
import type { PostSummary } from "@/lib/content";
import { categoryLabel, formatDateShort } from "@/lib/site";
import { readingMinutes, refine } from "@/lib/typography";

/**
 * The register of texts — the central navigational device of the site. Date
 * and category sit in the left column; the title and teaser occupy the main
 * measure. No running number: its position in a list that reorders itself on
 * every filter told a reader nothing the title does not.
 */
export function PostIndex({
  posts,
  showLead = true,
}: {
  posts: PostSummary[];
  showLead?: boolean;
}) {
  return (
    // role="list" restores what `list-style: none` takes away: Safari drops
    // list semantics from an unstyled list, and this register is the site's
    // main navigational device — the item count is the point.
    <ol className="index-list" role="list">
      {posts.map((post) => (
        <li key={post.id} className="index-item">
          <Link href={`/texte/${post.slug}`} className="index-item__link">
            <span className="index-item__meta">
              <span className="label">{categoryLabel(post.category)}</span>
              <span className="label label--faint">
                {formatDateShort(post.published_at)}
              </span>
            </span>

            <span className="index-item__main">
              <span className="index-item__title">{refine(post.title)}</span>
              {showLead && post.lead && (
                <span className="index-item__lead">{refine(post.lead)}</span>
              )}
              <span className="label label--faint index-item__reading">
                {readingMinutes(post.word_count)} Min. Lesezeit
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
