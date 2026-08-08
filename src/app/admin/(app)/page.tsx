import Link from "next/link";
import { listAllPosts } from "@/lib/content";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { categoryLabel, formatDateShort } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [posts, subscriberRows, newsletterRows] = await Promise.all([
    listAllPosts(),
    query<{ status: string; count: string }>(
      `SELECT status, count(*)::text AS count FROM subscribers GROUP BY status`,
    ),
    query<{ status: string; count: string }>(
      `SELECT status, count(*)::text AS count FROM newsletters GROUP BY status`,
    ),
  ]);

  const subscribers = Object.fromEntries(
    subscriberRows.map((r) => [r.status, Number(r.count)]),
  );
  const newsletters = Object.fromEntries(
    newsletterRows.map((r) => [r.status, Number(r.count)]),
  );

  const published = posts.filter((p) => p.status === "published");
  const drafts = posts.filter((p) => p.status === "draft");
  const recent = posts.slice(0, 8);

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Overview</p>
          <h1 className="admin-head__title">Good day.</h1>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/texts/new" className="button">
            Write a new text
          </Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat__value">{published.length}</span>
          <span className="label">Published</span>
        </div>
        <div className="stat">
          <span className="stat__value">{drafts.length}</span>
          <span className="label">Drafts</span>
        </div>
        <div className="stat">
          <span className="stat__value">{subscribers.confirmed ?? 0}</span>
          <span className="label">Subscribers</span>
        </div>
        <div className="stat">
          <span className="stat__value">{subscribers.pending ?? 0}</span>
          <span className="label">Awaiting confirmation</span>
        </div>
        <div className="stat">
          <span className="stat__value">{newsletters.sent ?? 0}</span>
          <span className="label">Issues sent</span>
        </div>
      </div>

      {!env.mailConfigured && (
        <div className="notice notice--error" style={{ marginBottom: "var(--space-8)" }}>
          <strong>E-mail is not configured.</strong> Confirmation messages and
          newsletters are written to the server log instead of being sent. Set
          SMTP_HOST, SMTP_USER and SMTP_PASSWORD to enable sending.
        </div>
      )}

      <section className="admin-section">
        <div className="admin-head">
          <h2 className="admin-head__title" style={{ fontSize: "var(--text-xl)" }}>
            Recent texts
          </h2>
          <div className="admin-head__actions">
            <Link href="/admin/texts" className="button button--ghost button--small">
              All texts
            </Link>
          </div>
        </div>

        {recent.length === 0 ? (
          <p className="admin-empty">
            Nothing written yet. Start with <Link href="/admin/texts/new">a new text</Link> —
            you can save it as a draft and come back to it any time.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Date</th>
                <th className="admin-table__actions">Words</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((post) => (
                <tr key={post.id}>
                  <td>
                    <Link
                      href={`/admin/texts/${post.id}`}
                      className="admin-table__title"
                    >
                      {post.title || "Untitled"}
                    </Link>
                    {post.subtitle && (
                      <div className="admin-table__sub">{post.subtitle}</div>
                    )}
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
                    {post.word_count.toLocaleString("de-CH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
