"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function deleteSubscriberAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = Number(formData.get("id"));
  if (id) {
    await query(`DELETE FROM subscribers WHERE id = $1`, [id]);
    revalidatePath("/admin/subscribers");
  }
}

/** Marks an address as unsubscribed without deleting the record. */
export async function unsubscribeAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = Number(formData.get("id"));
  if (id) {
    await query(
      `UPDATE subscribers
          SET status = 'unsubscribed', unsubscribed_at = now(), confirm_token = NULL
        WHERE id = $1`,
      [id],
    );
    revalidatePath("/admin/subscribers");
  }
}
