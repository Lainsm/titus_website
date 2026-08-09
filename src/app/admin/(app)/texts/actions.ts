"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { takenSlugs } from "@/lib/content";
import { insert, query, queryOne } from "@/lib/db";
import type { PostFormState } from "@/lib/form-states";
import { sanitizeProse } from "@/lib/sanitize";
import { CATEGORY_KEYS } from "@/lib/site";
import { slugify, uniqueSlug } from "@/lib/slug";
import { countWords } from "@/lib/typography";


function refreshPublicPages(slug: string) {
  revalidatePath("/");
  revalidatePath("/texte");
  revalidatePath(`/texte/${slug}`);
  revalidatePath("/feed.xml");
}

export async function savePostAction(
  _previous: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireUser();

  const idRaw = String(formData.get("id") ?? "");
  const id = idRaw ? Number(idRaw) : null;
  const intent = String(formData.get("intent") ?? "save");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "A text needs a title before it can be saved.", message: "" };
  }

  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const lead = String(formData.get("lead") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "erzaehlung");
  const category = CATEGORY_KEYS.includes(categoryRaw as never)
    ? categoryRaw
    : "erzaehlung";

  const bodyHtml = sanitizeProse(String(formData.get("body_html") ?? ""));
  const wordCount = countWords(bodyHtml);

  // A slug typed by hand wins; otherwise derive it from the title.
  const slugInput = String(formData.get("slug") ?? "").trim();
  const desired = slugify(slugInput || title);
  const slug = uniqueSlug(desired, await takenSlugs(id ?? undefined));

  const publishedAtInput = String(formData.get("published_at") ?? "").trim();

  let status: "draft" | "published";
  if (intent === "publish") status = "published";
  else if (intent === "unpublish") status = "draft";
  else {
    const existing = id
      ? await queryOne<{ status: string }>(
          `SELECT status FROM posts WHERE id = $1`,
          [id],
        )
      : null;
    status = (existing?.status as "draft" | "published") ?? "draft";
  }

  // Publishing without an explicit date means "now".
  const publishedAt =
    status === "published"
      ? publishedAtInput
        ? new Date(publishedAtInput)
        : ((
            await queryOne<{ published_at: Date | null }>(
              `SELECT published_at FROM posts WHERE id = $1`,
              [id ?? 0],
            )
          )?.published_at ?? new Date())
      : publishedAtInput
        ? new Date(publishedAtInput)
        : null;

  if (id) {
    await query(
      `UPDATE posts
          SET slug = $1, title = $2, subtitle = $3, category = $4, lead = $5,
              body_html = $6, word_count = $7, status = $8, published_at = $9,
              updated_at = now()
        WHERE id = $10`,
      [
        slug,
        title,
        subtitle,
        category,
        lead,
        bodyHtml,
        wordCount,
        status,
        publishedAt,
        id,
      ],
    );
    refreshPublicPages(slug);
    return {
      error: "",
      message:
        intent === "publish"
          ? "Published. It is live on the site now."
          : intent === "unpublish"
            ? "Moved back to drafts. It is no longer public."
            : "Saved.",
    };
  }

  // MariaDB has no portable RETURNING; insert() hands back insertId instead.
  const createdId = await insert(
    `INSERT INTO posts
       (slug, title, subtitle, category, lead, body_html, word_count, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      slug,
      title,
      subtitle,
      category,
      lead,
      bodyHtml,
      wordCount,
      status,
      publishedAt,
    ],
  );

  refreshPublicPages(slug);
  redirect(`/admin/texts/${createdId}?saved=1`);
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!id) return;

  const post = await queryOne<{ slug: string }>(
    `SELECT slug FROM posts WHERE id = $1`,
    [id],
  );

  await query(`DELETE FROM posts WHERE id = $1`, [id]);
  if (post) refreshPublicPages(post.slug);

  redirect("/admin/texts");
}
