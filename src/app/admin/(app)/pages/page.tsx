import Link from "next/link";
import { listPages } from "@/lib/content";
import { formatDateShort } from "@/lib/site";

export const dynamic = "force-dynamic";

const STANDING_PAGES = [
  {
    slug: "ueber",
    title: "Über",
    url: "/ueber",
    note: "Who you are, what you write, how to reach you.",
  },
  {
    slug: "impressum",
    title: "Impressum",
    url: "/impressum",
    note: "Name and contact address of the person responsible.",
  },
  {
    slug: "datenschutz",
    title: "Datenschutz",
    url: "/datenschutz",
    note: "What the site stores. A usable draft is already in place.",
  },
];

export default async function AdminPagesIndex() {
  const written = await listPages();
  const byslug = new Map(written.map((p) => [p.slug, p]));

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Pages</p>
          <h1 className="admin-head__title">Standing pages</h1>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Page</th>
            <th>Address</th>
            <th>Status</th>
            <th className="admin-table__actions">Last edited</th>
          </tr>
        </thead>
        <tbody>
          {STANDING_PAGES.map((page) => {
            const record = byslug.get(page.slug);
            const written = Boolean(record?.body_html?.trim());
            return (
              <tr key={page.slug}>
                <td>
                  <Link
                    href={`/admin/pages/${page.slug}`}
                    className="admin-table__title"
                  >
                    {record?.title || page.title}
                  </Link>
                  <div className="admin-table__sub">{page.note}</div>
                </td>
                <td className="admin-table__num">
                  <Link href={page.url} target="_blank">
                    {page.url}
                  </Link>
                </td>
                <td>
                  <span
                    className={`badge badge--${written ? "published" : "draft"}`}
                  >
                    {written ? "written" : "placeholder"}
                  </span>
                </td>
                <td className="admin-table__num admin-table__actions">
                  {record ? formatDateShort(record.updated_at) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
