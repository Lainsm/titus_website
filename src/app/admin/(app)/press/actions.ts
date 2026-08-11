"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { PRESS_KINDS, type PressKind } from "@/lib/site";

function readForm(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "artikel");
  /*
   * <input type="date"> submits 'YYYY-MM-DD' and nothing else. It goes to the
   * DATE column exactly as typed — no `new Date()` anywhere in this path,
   * because parsing it would resolve a bare calendar date against the server's
   * time zone and hand back an instant that can land on the previous day.
   */
  const publishedAt = String(formData.get("published_at") ?? "").trim();

  return {
    outlet: String(formData.get("outlet") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(publishedAt) ? publishedAt : null,
    kind: (kindRaw in PRESS_KINDS ? kindRaw : "artikel") as PressKind,
    quote: String(formData.get("quote") ?? "").trim(),
    archiveUrl: String(formData.get("archive_url") ?? "").trim(),
    language: String(formData.get("language") ?? "de").trim() || "de",
    sortOrder: Number(String(formData.get("sort_order") ?? "0")) || 0,
  };
}

export async function savePressAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get("id")) || null;
  const v = readForm(formData);

  if (!v.title || !v.outlet) {
    redirect(
      id ? `/admin/press/${id}?error=required` : "/admin/press/new?error=required",
    );
  }

  if (id) {
    await query(
      `UPDATE press
          SET outlet = $1, title = $2, url = $3, published_at = $4, kind = $5,
              quote = $6, archive_url = $7, language = $8, sort_order = $9
        WHERE id = $10`,
      [
        v.outlet,
        v.title,
        v.url,
        v.publishedAt,
        v.kind,
        v.quote,
        v.archiveUrl,
        v.language,
        v.sortOrder,
        id,
      ],
    );
  } else {
    await query(
      `INSERT INTO press
         (outlet, title, url, published_at, kind, quote, archive_url, language, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        v.outlet,
        v.title,
        v.url,
        v.publishedAt,
        v.kind,
        v.quote,
        v.archiveUrl,
        v.language,
        v.sortOrder,
      ],
    );
  }

  // The press list and its subjectOf markup both live on /ueber.
  revalidatePath("/ueber");
  redirect("/admin/press?saved=1");
}

export async function deletePressAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = Number(formData.get("id"));
  if (id) {
    await query(`DELETE FROM press WHERE id = $1`, [id]);
    revalidatePath("/ueber");
  }
  redirect("/admin/press");
}
