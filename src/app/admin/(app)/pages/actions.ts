"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import type { PageFormState } from "@/lib/form-states";
import { sanitizeProse } from "@/lib/sanitize";


/** Only these three standing pages exist; the slug is never user-defined. */
const EDITABLE = new Set(["ueber", "impressum", "datenschutz"]);

export async function savePageAction(
  _previous: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  await requireUser();

  const slug = String(formData.get("slug") ?? "");
  if (!EDITABLE.has(slug)) {
    return { error: "Unknown page.", message: "" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const bodyHtml = sanitizeProse(String(formData.get("body_html") ?? ""));

  await query(
    `INSERT INTO pages (slug, title, body_html, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON DUPLICATE KEY UPDATE title = VALUES(title),
                             body_html = VALUES(body_html),
                             updated_at = NOW()`,
    [slug, title || slug, bodyHtml],
  );

  revalidatePath(`/${slug}`);

  return { error: "", message: "Saved. The page is updated on the site." };
}
