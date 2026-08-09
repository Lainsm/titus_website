import Link from "next/link";
import { notFound } from "next/navigation";
import { PageForm } from "@/components/page-form";
import { getPage } from "@/lib/content";

export const dynamic = "force-dynamic";

const TITLES: Record<string, { title: string; url: string }> = {
  ueber: { title: "Über", url: "/ueber" },
  impressum: { title: "Impressum", url: "/impressum" },
  datenschutz: { title: "Datenschutz", url: "/datenschutz" },
};

export default async function EditStandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = TITLES[slug];
  if (!meta) notFound();

  const page = await getPage(slug);

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Page</p>
          <h1 className="admin-head__title admin-head__title--document">
            {page?.title || meta.title}
          </h1>
        </div>
        <div className="admin-head__actions">
          <Link href={meta.url} target="_blank" className="button button--ghost button--small">
            View ↗
          </Link>
          <Link href="/admin/pages" className="button button--ghost button--small">
            ← All pages
          </Link>
        </div>
      </div>

      <PageForm
        slug={slug}
        title={page?.title || meta.title}
        bodyHtml={page?.body_html ?? ""}
      />
    </>
  );
}
