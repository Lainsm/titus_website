"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { PUBLICATION_KINDS, type PublicationKind } from "@/lib/site";

function readForm(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "buch");
  const yearRaw = String(formData.get("year") ?? "").trim();

  return {
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim(),
    publisher: String(formData.get("publisher") ?? "").trim(),
    year: yearRaw ? Number(yearRaw) : null,
    kind: (kindRaw in PUBLICATION_KINDS ? kindRaw : "buch") as PublicationKind,
    description: String(formData.get("description") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    isbn: String(formData.get("isbn") ?? "").trim(),
    sortOrder: Number(String(formData.get("sort_order") ?? "0")) || 0,
  };
}

export async function savePublicationAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get("id")) || null;
  const v = readForm(formData);

  if (!v.title) {
    redirect(id ? `/admin/publications/${id}?error=title` : "/admin/publications/new?error=title");
  }

  if (id) {
    await query(
      `UPDATE publications
          SET title = $1, subtitle = $2, publisher = $3, year = $4, kind = $5,
              description = $6, url = $7, isbn = $8, sort_order = $9
        WHERE id = $10`,
      [
        v.title,
        v.subtitle,
        v.publisher,
        v.year,
        v.kind,
        v.description,
        v.url,
        v.isbn,
        v.sortOrder,
        id,
      ],
    );
  } else {
    await query(
      `INSERT INTO publications
         (title, subtitle, publisher, year, kind, description, url, isbn, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        v.title,
        v.subtitle,
        v.publisher,
        v.year,
        v.kind,
        v.description,
        v.url,
        v.isbn,
        v.sortOrder,
      ],
    );
  }

  revalidatePath("/publikationen");
  redirect("/admin/publications?saved=1");
}

export async function deletePublicationAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = Number(formData.get("id"));
  if (id) {
    await query(`DELETE FROM publications WHERE id = $1`, [id]);
    revalidatePath("/publikationen");
  }
  redirect("/admin/publications");
}
