import Link from "next/link";
import { listAllPosts } from "@/lib/content";
import { categoryLabel, formatDateShort } from "@/lib/site";
import { readingMinutes } from "@/lib/typography";

export const dynamic = "force-dynamic";

export default async function AdminTextsPage() {
  const posts = await listAllPosts();
  const drafts = posts.filter((p) => p.status === "draft");
  const published = posts.filter((p) => p.status === "published");

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Texts</p>
          <h1 className="admin-head__title">
            {published.length} published, {drafts.length} in draft
          </h1>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/texts/new" className="button">
            New text
          </Link>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="admin-empty">
          No texts yet. <Link href="/admin/texts/new">Write the first one</Link>.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Date</th>
              <th className="admin-table__actions">Length</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <Link
                    href={`/admin/texts/${post.id}`}
                    className="admin-table__title"
                  >
                    {post.title || "Untitled"}
                  </Link>
                  <div className="admin-table__sub">/texte/{post.slug}</div>
                </td>
                <td className="admin-table__num">
                  {categoryLabel(post.category)}
                </td>
                <td>
                  <span className={`badge badge--${post.status}`}>
                    {post.status}
                  </span>
                </td>
                <td className="admin-table__num">
                  {formatDateShort(post.published_at ?? post.updated_at)}
                </td>
                <td className="admin-table__num admin-table__actions">
                  {post.word_count.toLocaleString("de-CH")} w ·{" "}
                  {readingMinutes(post.word_count)} min
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
