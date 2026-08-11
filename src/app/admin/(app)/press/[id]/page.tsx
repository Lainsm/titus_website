import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deletePressAction,
  savePressAction,
} from "@/app/admin/(app)/press/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { PressFields } from "@/components/press-fields";
import { getPressItem } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function EditPressPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const item = await getPressItem(Number(id));
  if (!item) notFound();

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Press</p>
          <h1 className="admin-head__title admin-head__title--document">
            {item.title}
          </h1>
          <p className="label label--stacked">{item.outlet}</p>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/press" className="button button--ghost button--small">
            ← All press
          </Link>
          <form action={deletePressAction} className="inline-form">
            <input type="hidden" name="id" value={item.id} />
            <ConfirmButton
              className="button button--danger button--small"
              message={`Delete «${item.title}» from the press list?`}
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      {error === "required" && (
        <div className="notice notice--error notice--page">
          A press entry needs an outlet and a headline.
        </div>
      )}

      <form action={savePressAction}>
        <input type="hidden" name="id" value={item.id} />
        <PressFields item={item} />
        <div className="form-actions">
          <button type="submit" className="button">
            Save changes
          </button>
        </div>
      </form>
    </>
  );
}
