import type { Metadata } from "next";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Newsletter abbestellen",
  robots: { index: false, follow: false },
};

export default async function AbmeldenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let done = false;

  if (token) {
    const subscriber = await queryOne<{ id: number }>(
      `SELECT id FROM subscribers WHERE unsubscribe_token = $1`,
      [token],
    );
    if (subscriber) {
      await query(
        `UPDATE subscribers
            SET status = 'unsubscribed', unsubscribed_at = now(), confirm_token = NULL
          WHERE id = $1`,
        [subscriber.id],
      );
      done = true;
    }
  }

  return (
    <div className="container status-page">
      <p className="label label--accent">Newsletter</p>
      <h1 className="status-page__title">
        {done ? "Sie sind abgemeldet." : "Der Abmeldelink ist ungültig."}
      </h1>
      <p className="status-page__text">
        {done
          ? "Sie erhalten keine weiteren Nachrichten. Falls es ein Versehen war, können Sie sich jederzeit wieder anmelden — ich nehme es Ihnen nicht übel."
          : "Möglicherweise wurde die Adresse bereits entfernt. Falls weiterhin Nachrichten ankommen, antworten Sie einfach auf eine davon."}
      </p>
      <div className="status-page__actions">
        <Link href="/" className="button button--ghost">
          Zur Startseite
        </Link>
        {done && (
          <Link href="/newsletter" className="button button--ghost">
            Doch wieder anmelden
          </Link>
        )}
      </div>
    </div>
  );
}
