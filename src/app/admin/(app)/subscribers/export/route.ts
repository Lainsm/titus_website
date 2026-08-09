import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Route handlers sit outside the layout guard, so the check happens here. */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return new Response("Not signed in.", { status: 401 });
  }

  const rows = await query<{
    email: string;
    name: string;
    status: string;
    created_at: string;
    confirmed_at: string | null;
  }>(
    `SELECT email, name, status, created_at, confirmed_at
       FROM subscribers
      ORDER BY created_at ASC`,
  );

  /*
   * Quoting alone is not enough. Subscriber names arrive from a public form,
   * and Excel and Sheets treat a leading =, +, - or @ as the start of a
   * formula — so a name like `=HYPERLINK("http://evil","click")` executes when
   * the author opens their own export. Prefixing a single quote makes the cell
   * literal text; it is the standard mitigation for CSV injection and is
   * stripped from view by every spreadsheet that honours it.
   */
  const escape = (value: string) => {
    const raw = String(value ?? "");
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const csv = [
    ["email", "name", "status", "signed_up", "confirmed"].join(","),
    ...rows.map((r) =>
      [
        escape(r.email),
        escape(r.name),
        escape(r.status),
        escape(new Date(r.created_at).toISOString()),
        escape(r.confirmed_at ? new Date(r.confirmed_at).toISOString() : ""),
      ].join(","),
    ),
  ].join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
