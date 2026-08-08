import Link from "next/link";
import { PostForm } from "@/components/post-form";

export const dynamic = "force-dynamic";

export default function NewTextPage() {
  return (
    <>
      <div className="admin-head">
        <div>
          <p className="label label--accent">New text</p>
          <h1 className="admin-head__title">Write</h1>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/texts" className="button button--ghost button--small">
            ← All texts
          </Link>
        </div>
      </div>

      <PostForm
        values={{
          title: "",
          subtitle: "",
          category: "erzaehlung",
          lead: "",
          slug: "",
          body_html: "",
          status: "draft",
          published_at: null,
        }}
      />
    </>
  );
}
