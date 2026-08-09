import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe, RFC 8058.
 *
 * The newsletter advertises `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
 * which is a promise that the List-Unsubscribe URL answers a POST. It used to
 * point at /newsletter/abmelden, which is a page — GET only — so Gmail's and
 * Yahoo's unsubscribe button POSTed and got a 405, and the reader stayed
 * subscribed while believing they had left. Under Google's bulk-sender rules
 * that is also a deliverability problem, not only a courtesy one.
 *
 * This is the POST half. The page beside it stays as the human-facing link.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new Response("Missing token.", { status: 400 });

  const subscriber = await queryOne<{ id: number }>(
    `SELECT id FROM subscribers WHERE unsubscribe_token = $1`,
    [token],
  );

  // An unknown or already-spent token still answers 200: the sender only needs
  // to know the request was understood, and distinguishing the two would turn
  // this into an oracle for which tokens are live.
  if (subscriber) {
    await query(
      `UPDATE subscribers
          SET status = 'unsubscribed', unsubscribed_at = now()
        WHERE id = $1`,
      [subscriber.id],
    );
  }

  return new Response(null, { status: 200 });
}
