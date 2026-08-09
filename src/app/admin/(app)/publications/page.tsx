import Link from "next/link";
import { listPublications } from "@/lib/content";
import { PUBLICATION_KINDS, type PublicationKind } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminPublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const publications = await listPublications();

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Publications</p>
          <h1 className="admin-head__title">
            {publications.length}{" "}
            {publications.length === 1 ? "entry" : "entries"}
          </h1>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/publications/new" className="button">
            Add publication
          </Link>
        </div>
      </div>

      {saved === "1" && (
        <div className="notice notice--success notice--page">
          Saved.
        </div>
      )}

      {publications.length === 0 ? (
        <p className="admin-empty">
          Nothing listed yet. Books, essays in anthologies, articles and talks
          all belong here — they appear on the public Publikationen page.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Kind</th>
              <th>Year</th>
              <th className="admin-table__actions">Order</th>
            </tr>
          </thead>
          <tbody>
            {publications.map((publication) => (
              <tr key={publication.id}>
                <td>
                  <Link
                    href={`/admin/publications/${publication.id}`}
                    className="admin-table__title"
                  >
                    {publication.title}
                  </Link>
                  {publication.publisher && (
                    <div className="admin-table__sub">
                      {publication.publisher}
                    </div>
                  )}
                </td>
                <td className="admin-table__num">
                  {PUBLICATION_KINDS[publication.kind as PublicationKind] ??
                    publication.kind}
                </td>
                <td className="admin-table__num">{publication.year ?? "—"}</td>
                <td className="admin-table__num admin-table__actions">
                  {publication.sort_order}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
