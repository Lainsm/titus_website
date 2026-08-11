import Link from "next/link";
import { savePressAction } from "@/app/admin/(app)/press/actions";
import { PressFields } from "@/components/press-fields";

export const dynamic = "force-dynamic";

export default async function NewPressPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <form action={savePressAction}>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Press</p>
          <h1 className="admin-head__title">Add press entry</h1>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/press" className="button button--ghost button--small">
            ← All press
          </Link>
          <button type="submit" className="button button--small">
            Save
          </button>
        </div>
      </div>

      {error === "required" && (
        <div className="notice notice--error notice--page">
          A press entry needs an outlet and a headline.
        </div>
      )}

      <PressFields />
    </form>
  );
}
