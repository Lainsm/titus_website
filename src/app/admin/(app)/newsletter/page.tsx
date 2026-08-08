import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { env } from "@/lib/env";
import { formatDateShort } from "@/lib/site";

export const dynamic = "force-dynamic";

type IssueRow = {
  id: number;
  subject: string;
  intro: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  updated_at: string;
};

export default async function AdminNewsletterPage() {
  const [issues, confirmed] = await Promise.all([
    query<IssueRow>(
      `SELECT id, subject, intro, status, sent_at, sent_count, failed_count, updated_at
         FROM newsletters
        ORDER BY COALESCE(sent_at, updated_at) DESC`,
    ),
    queryOne<{ count: string }>(
      `SELECT count(*)::text AS count FROM subscribers WHERE status = 'confirmed'`,
    ),
  ]);

  const recipients = Number(confirmed?.count ?? 0);

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Newsletter</p>
          <h1 className="admin-head__title">
            {recipients} {recipients === 1 ? "subscriber" : "subscribers"}
          </h1>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/newsletter/new" className="button">
            Write an issue
          </Link>
        </div>
      </div>

      {!env.mailConfigured && (
        <div className="notice notice--error" style={{ marginBottom: "var(--space-8)" }}>
          <strong>E-mail is not configured.</strong> Nothing will actually be
          delivered — messages are written to the server log instead. Set the
          SMTP variables to send for real.
        </div>
      )}

      {issues.length === 0 ? (
        <p className="admin-empty">
          No issues yet. An issue is a short note — a paragraph or two and a
          link to the new text. Subscribers who have not confirmed their
          address never receive anything.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Status</th>
              <th>Date</th>
              <th className="admin-table__actions">Delivered</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td>
                  <Link
                    href={`/admin/newsletter/${issue.id}`}
                    className="admin-table__title"
                  >
                    {issue.subject || "Untitled issue"}
                  </Link>
                  {issue.intro && (
                    <div className="admin-table__sub">{issue.intro}</div>
                  )}
                </td>
                <td>
                  <span className={`badge badge--${issue.status}`}>
                    {issue.status}
                  </span>
                </td>
                <td className="admin-table__num">
                  {formatDateShort(issue.sent_at ?? issue.updated_at)}
                </td>
                <td className="admin-table__num admin-table__actions">
                  {issue.sent_count}
                  {issue.failed_count > 0 && (
                    <span style={{ color: "var(--accent)" }}>
                      {" "}
                      · {issue.failed_count} failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
