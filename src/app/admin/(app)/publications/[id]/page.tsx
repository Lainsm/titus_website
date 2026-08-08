import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deletePublicationAction,
  savePublicationAction,
} from "@/app/admin/(app)/publications/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { PublicationFields } from "@/components/publication-fields";
import { getPublication } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function EditPublicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const publication = await getPublication(Number(id));
  if (!publication) notFound();

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Publications</p>
          <h1 className="admin-head__title" style={{ fontSize: "var(--text-xl)" }}>
            {publication.title}
          </h1>
        </div>
        <div className="admin-head__actions">
          <Link
            href="/admin/publications"
            className="button button--ghost button--small"
          >
            ← All publications
          </Link>
          <form action={deletePublicationAction} className="inline-form">
            <input type="hidden" name="id" value={publication.id} />
            <ConfirmButton
              className="button button--danger button--small"
              message={`Delete «${publication.title}» from the list?`}
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      {error === "title" && (
        <div className="notice notice--error" style={{ marginBottom: "var(--space-8)" }}>
          A publication needs a title.
        </div>
      )}

      <form action={savePublicationAction}>
        <input type="hidden" name="id" value={publication.id} />
        <PublicationFields publication={publication} />
        <div style={{ marginTop: "var(--space-8)" }}>
          <button type="submit" className="button">
            Save changes
          </button>
        </div>
      </form>
    </>
  );
}
