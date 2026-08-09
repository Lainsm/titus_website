import type { Metadata } from "next";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anmeldung bestätigen",
  robots: { index: false, follow: false },
};

export default async function BestaetigenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let state: "confirmed" | "already" | "invalid" = "invalid";

  if (token) {
    const subscriber = await queryOne<{ id: number; status: string }>(
      `SELECT id, status FROM subscribers WHERE confirm_token = $1`,
      [token],
    );

    if (subscriber) {
      // Clearing the token makes the link single-use.
      await query(
        `UPDATE subscribers
            SET status = 'confirmed', confirmed_at = now(), confirm_token = NULL
          WHERE id = $1`,
        [subscriber.id],
      );
      state = "confirmed";
    } else {
      // Either already used, or wrong. Both look the same to a visitor.
      state = "already";
    }
  }

  const copy = {
    confirmed: {
      label: "Willkommen",
      title: "Ihre Anmeldung ist bestätigt.",
      text: "Sie stehen jetzt auf der Liste. Beim nächsten Text melde ich mich — bis dahin finden Sie im Register alles, was bisher erschienen ist.",
    },
    already: {
      label: "Hinweis",
      title: "Dieser Link ist nicht mehr gültig.",
      text: "Vermutlich haben Sie Ihre Anmeldung bereits bestätigt — dann ist alles in Ordnung. Falls nicht, melden Sie sich einfach noch einmal an.",
    },
    invalid: {
      label: "Fehler",
      title: "Es fehlt ein Bestätigungslink.",
      text: "Bitte öffnen Sie den Link aus der Bestätigungsmail, oder melden Sie sich neu an.",
    },
  }[state];

  return (
    <div className="status-page">
      <p className="label label--accent">{copy.label}</p>
      <h1 className="status-page__title">{copy.title}</h1>
      <p className="status-page__text">{copy.text}</p>
      <div className="status-page__actions">
        <Link href="/texte" className="button">
          Zum Register
        </Link>
        {state !== "confirmed" && (
          <Link href="/newsletter" className="button button--ghost">
            Neu anmelden
          </Link>
        )}
      </div>
    </div>
  );
}
