import Link from "next/link";
import { savePublicationAction } from "@/app/admin/(app)/publications/actions";
import { PublicationFields } from "@/components/publication-fields";

export const dynamic = "force-dynamic";

export default async function NewPublicationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <form action={savePublicationAction}>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Publications</p>
          <h1 className="admin-head__title">Add publication</h1>
        </div>
        <div className="admin-head__actions">
          <Link
            href="/admin/publications"
            className="button button--ghost button--small"
          >
            ← All publications
          </Link>
          <button type="submit" className="button button--small">
            Save
          </button>
        </div>
      </div>

      {error === "title" && (
        <div className="notice notice--error" style={{ marginBottom: "var(--space-8)" }}>
          A publication needs a title.
        </div>
      )}

      <PublicationFields />
    </form>
  );
}
