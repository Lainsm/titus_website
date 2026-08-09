import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteNewsletterAction } from "@/app/admin/(app)/newsletter/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { NewsletterForm } from "@/components/newsletter-form";
import { NewsletterSendPanel } from "@/components/newsletter-send";
import { queryOne } from "@/lib/db";
import { formatDateShort } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function EditNewsletterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const issue = await queryOne<{
    id: number;
    subject: string;
    intro: string;
    body_html: string;
    status: string;
    sent_at: string | null;
  }>(
    `SELECT id, subject, intro, body_html, status, sent_at
       FROM newsletters WHERE id = $1`,
    [Number(id)],
  );
  if (!issue) notFound();

  const stats = await queryOne<{ recipients: string; delivered: string }>(
    `SELECT
       (SELECT count(*) FROM subscribers WHERE status = 'confirmed')::text AS recipients,
       (SELECT count(*) FROM newsletter_deliveries
         WHERE newsletter_id = $1 AND status = 'sent')::text AS delivered`,
    [issue.id],
  );

  const recipientCount = Number(stats?.recipients ?? 0);
  const alreadySent = Number(stats?.delivered ?? 0);
  const readOnly = issue.status === "sent";

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Newsletter</p>
          <h1 className="admin-head__title admin-head__title--document">
            {issue.subject || "Untitled issue"}
          </h1>
          {issue.sent_at && (
            <p className="label label--stacked">
              Sent {formatDateShort(issue.sent_at)}
            </p>
          )}
        </div>
        <div className="admin-head__actions">
          <Link
            href="/admin/newsletter"
            className="button button--ghost button--small"
          >
            ← All issues
          </Link>
          <form action={deleteNewsletterAction} className="inline-form">
            <input type="hidden" name="id" value={issue.id} />
            <ConfirmButton
              className="button button--danger button--small"
              message={
                readOnly
                  ? "Delete the record of this sent issue? The messages themselves are already delivered."
                  : "Delete this draft?"
              }
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      <NewsletterForm
        id={issue.id}
        subject={issue.subject}
        intro={issue.intro}
        bodyHtml={issue.body_html}
        readOnly={readOnly}
        savedNotice={saved === "1"}
      >
        <NewsletterSendPanel
          id={issue.id}
          recipientCount={recipientCount}
          alreadySent={alreadySent}
          status={issue.status}
        />
      </NewsletterForm>
    </>
  );
}
