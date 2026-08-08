import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePostAction } from "@/app/admin/(app)/texts/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { PostForm } from "@/components/post-form";
import { getPostById } from "@/lib/content";
import { formatDateShort } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function EditTextPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const post = await getPostById(Number(id));
  if (!post) notFound();

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">Editing</p>
          <h1 className="admin-head__title" style={{ fontSize: "var(--text-xl)" }}>
            {post.title || "Untitled"}
          </h1>
          <p className="label" style={{ marginTop: "var(--space-2)" }}>
            Last saved {formatDateShort(post.updated_at)}
          </p>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/texts" className="button button--ghost button--small">
            ← All texts
          </Link>
          <form action={deletePostAction} className="inline-form">
            <input type="hidden" name="id" value={post.id} />
            <ConfirmButton
              className="button button--danger button--small"
              message={`Delete «${post.title}» permanently? This cannot be undone.`}
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      <PostForm
        savedNotice={saved === "1"}
        values={{
          id: post.id,
          title: post.title,
          subtitle: post.subtitle,
          category: post.category,
          lead: post.lead,
          slug: post.slug,
          body_html: post.body_html,
          status: post.status,
          published_at: post.published_at,
        }}
      />
    </>
  );
}
