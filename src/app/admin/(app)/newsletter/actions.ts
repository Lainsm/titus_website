"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { env } from "@/lib/env";
import type { NewsletterFormState, SendState } from "@/lib/form-states";
import { initialSendState } from "@/lib/form-states";
import { newsletterEmail, sendMail, styleForEmail } from "@/lib/mail";
import { sanitizeNewsletter } from "@/lib/sanitize";
import { htmlToText, refine, refineHtml } from "@/lib/typography";

/* -------------------------------------------------------------------------- */
/* Draft management                                                            */
/* -------------------------------------------------------------------------- */

export async function saveNewsletterAction(
  _previous: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  await requireUser();

  const id = Number(formData.get("id")) || null;
  const subject = String(formData.get("subject") ?? "").trim();
  const intro = String(formData.get("intro") ?? "").trim();
  const bodyHtml = sanitizeNewsletter(String(formData.get("body_html") ?? ""));

  if (!subject) {
    return { error: "The issue needs a subject line.", message: "" };
  }

  if (id) {
    const existing = await queryOne<{ status: string }>(
      `SELECT status FROM newsletters WHERE id = $1`,
      [id],
    );
    if (existing?.status === "sent") {
      return { error: "This issue has been sent and can no longer be edited.", message: "" };
    }

    await query(
      `UPDATE newsletters
          SET subject = $1, intro = $2, body_html = $3, updated_at = now()
        WHERE id = $4`,
      [subject, intro, bodyHtml, id],
    );
    return { error: "", message: "Saved." };
  }

  const created = await queryOne<{ id: number }>(
    `INSERT INTO newsletters (subject, intro, body_html)
     VALUES ($1, $2, $3) RETURNING id`,
    [subject, intro, bodyHtml],
  );

  redirect(`/admin/newsletter/${created!.id}?saved=1`);
}

export async function deleteNewsletterAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = Number(formData.get("id"));
  if (id) {
    await query(`DELETE FROM newsletters WHERE id = $1`, [id]);
  }
  redirect("/admin/newsletter");
}

/* -------------------------------------------------------------------------- */
/* Sending                                                                     */
/* -------------------------------------------------------------------------- */

type NewsletterRow = {
  id: number;
  subject: string;
  intro: string;
  body_html: string;
  status: string;
};

function renderIssue(newsletter: NewsletterRow, unsubscribeUrl: string): string {
  return newsletterEmail({
    subject: refine(newsletter.subject),
    intro: refine(newsletter.intro),
    bodyHtml: styleForEmail(refineHtml(newsletter.body_html)),
    unsubscribeUrl,
  });
}

/** Sends one copy to the signed-in editor, without touching delivery records. */
export async function sendTestAction(
  _previous: SendState,
  formData: FormData,
): Promise<SendState> {
  const user = await requireUser();
  const id = Number(formData.get("id"));

  const newsletter = await queryOne<NewsletterRow>(
    `SELECT id, subject, intro, body_html, status FROM newsletters WHERE id = $1`,
    [id],
  );
  if (!newsletter) {
    return { ...initialSendState, error: "Issue not found." };
  }

  try {
    await sendMail({
      to: user.email,
      subject: `[Test] ${refine(newsletter.subject)}`,
      html: renderIssue(
        newsletter,
        `${env.siteUrl}/newsletter/abmelden?token=test`,
      ),
    });
  } catch (error) {
    return {
      ...initialSendState,
      error: error instanceof Error ? error.message : "Sending failed.",
    };
  }

  return {
    ...initialSendState,
    message: env.mailConfigured
      ? `Test copy sent to ${user.email}.`
      : `SMTP is not configured — the test was written to the server log instead.`,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends one batch and reports what is left. Deliveries are recorded per
 * recipient, so pressing send again resumes rather than sending twice — and a
 * crash mid-run cannot double-mail anyone.
 *
 * The batch is sized so a run finishes well inside a normal request timeout;
 * the UI calls this repeatedly until `done`.
 */
export async function sendNewsletterAction(
  _previous: SendState,
  formData: FormData,
): Promise<SendState> {
  await requireUser();
  const id = Number(formData.get("id"));

  const newsletter = await queryOne<NewsletterRow>(
    `SELECT id, subject, intro, body_html, status FROM newsletters WHERE id = $1`,
    [id],
  );
  if (!newsletter) {
    return { ...initialSendState, error: "Issue not found." };
  }
  if (!newsletter.subject.trim()) {
    return { ...initialSendState, error: "The issue needs a subject line." };
  }

  const throttleMs = Math.max(0, env.smtp.throttleMs || 0);
  const batchSize = Math.max(5, Math.floor(25_000 / Math.max(throttleMs, 250)));

  const recipients = await query<{
    id: number;
    email: string;
    unsubscribe_token: string;
  }>(
    `SELECT s.id, s.email, s.unsubscribe_token
       FROM subscribers s
      WHERE s.status = 'confirmed'
        AND NOT EXISTS (
          SELECT 1 FROM newsletter_deliveries d
           WHERE d.newsletter_id = $1 AND d.subscriber_id = s.id
        )
      ORDER BY s.id
      LIMIT $2`,
    [newsletter.id, batchSize],
  );

  if (recipients.length === 0) {
    await query(
      `UPDATE newsletters SET status = 'sent', sent_at = COALESCE(sent_at, now()) WHERE id = $1`,
      [newsletter.id],
    );
    return {
      ...initialSendState,
      done: true,
      message: "Everyone on the list has this issue.",
    };
  }

  await query(`UPDATE newsletters SET status = 'sending' WHERE id = $1`, [
    newsletter.id,
  ]);

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const unsubscribeUrl = `${env.siteUrl}/newsletter/abmelden?token=${encodeURIComponent(recipient.unsubscribe_token)}`;
    const html = renderIssue(newsletter, unsubscribeUrl);

    try {
      await sendMail({
        to: recipient.email,
        subject: refine(newsletter.subject),
        html,
        text: htmlToText(html),
        unsubscribeUrl,
      });
      await query(
        `INSERT INTO newsletter_deliveries (newsletter_id, subscriber_id, status)
         VALUES ($1, $2, 'sent')
         ON CONFLICT (newsletter_id, subscriber_id) DO NOTHING`,
        [newsletter.id, recipient.id],
      );
      sent += 1;
    } catch (error) {
      await query(
        `INSERT INTO newsletter_deliveries (newsletter_id, subscriber_id, status, error)
         VALUES ($1, $2, 'failed', $3)
         ON CONFLICT (newsletter_id, subscriber_id) DO UPDATE SET status = 'failed', error = EXCLUDED.error`,
        [
          newsletter.id,
          recipient.id,
          error instanceof Error ? error.message.slice(0, 500) : "unknown",
        ],
      );
      failed += 1;
    }

    if (throttleMs > 0) await sleep(throttleMs);
  }

  const remainingRow = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM subscribers s
      WHERE s.status = 'confirmed'
        AND NOT EXISTS (
          SELECT 1 FROM newsletter_deliveries d
           WHERE d.newsletter_id = $1 AND d.subscriber_id = s.id
        )`,
    [newsletter.id],
  );
  const remaining = Number(remainingRow?.count ?? 0);

  await query(
    `UPDATE newsletters
        SET sent_count = (SELECT count(*) FROM newsletter_deliveries
                           WHERE newsletter_id = $1 AND status = 'sent'),
            failed_count = (SELECT count(*) FROM newsletter_deliveries
                             WHERE newsletter_id = $1 AND status = 'failed'),
            status = CASE WHEN $2::int = 0 THEN 'sent' ELSE 'sending' END,
            sent_at = CASE WHEN $2::int = 0 THEN COALESCE(sent_at, now()) ELSE sent_at END
      WHERE id = $1`,
    [newsletter.id, remaining],
  );

  return {
    error: "",
    sent,
    failed,
    remaining,
    done: remaining === 0,
    message:
      remaining === 0
        ? `Done — this issue has gone out to everyone.`
        : `${sent} sent in this batch, ${remaining} still to go.`,
  };
}
