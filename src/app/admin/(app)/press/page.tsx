import Link from "next/link";
import { listPress } from "@/lib/content";
import { PRESS_KINDS, type PressKind, formatDateShort } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminPressPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const items = await listPress();

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Press</p>
          <h1 className="admin-head__title">
            {items.length} {items.length === 1 ? "entry" : "entries"}
          </h1>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/press/new" className="button">
            Add press entry
          </Link>
        </div>
      </div>

      {saved === "1" && (
        <div className="notice notice--success notice--page">Saved.</div>
      )}

      {items.length === 0 ? (
        <p className="admin-empty">
          Nothing listed yet. Interviews, portraits, reviews and radio
          appearances belong here — what other people wrote about him, not what
          he wrote. They appear at the foot of the public Über page.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Headline</th>
              <th>Kind</th>
              <th>Date</th>
              <th className="admin-table__actions">Link</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link
                    href={`/admin/press/${item.id}`}
                    className="admin-table__link"
                  >
                    {item.title}
                  </Link>
                  <span className="admin-table__meta">{item.outlet}</span>
                </td>
                <td>{PRESS_KINDS[item.kind as PressKind] ?? item.kind}</td>
                <td>{item.published_at ? formatDateShort(item.published_at) : "—"}</td>
                <td className="admin-table__actions">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      open ↗
                    </a>
                  ) : (
                    "—"
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
