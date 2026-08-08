"use server";

import { query, queryOne } from "@/lib/db";
import { randomToken } from "@/lib/auth";
import { env } from "@/lib/env";
import type { SubscribeState } from "@/lib/form-states";
import { confirmationEmail, sendMail } from "@/lib/mail";


// Deliberately permissive: the confirmation mail is the real validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function subscribeAction(
  _previous: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  // Bots fill every field they find, including the hidden one.
  if ((formData.get("website") as string)?.trim()) {
    return { status: "success", message: "Bitte prüfen Sie Ihr Postfach." };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);

  if (!EMAIL_PATTERN.test(email)) {
    return {
      status: "error",
      message: "Bitte geben Sie eine gültige E-Mail-Adresse an.",
    };
  }

  const existing = await queryOne<{
    id: number;
    status: string;
    confirm_token: string | null;
  }>(`SELECT id, status, confirm_token FROM subscribers WHERE email = $1`, [
    email,
  ]);

  if (existing?.status === "confirmed") {
    return {
      status: "already",
      message: "Sie sind bereits für den Newsletter angemeldet.",
    };
  }

  const confirmToken = randomToken();

  if (existing) {
    // Pending or previously unsubscribed — issue a fresh token and ask again.
    await query(
      `UPDATE subscribers
          SET status = 'pending', confirm_token = $1, name = COALESCE(NULLIF($2, ''), name),
              unsubscribed_at = NULL
        WHERE id = $3`,
      [confirmToken, name, existing.id],
    );
  } else {
    await query(
      `INSERT INTO subscribers (email, name, status, confirm_token, unsubscribe_token)
       VALUES ($1, $2, 'pending', $3, $4)`,
      [email, name, confirmToken, randomToken()],
    );
  }

  const confirmUrl = `${env.siteUrl}/newsletter/bestaetigen?token=${encodeURIComponent(confirmToken)}`;

  try {
    const { subject, html } = confirmationEmail({ name, confirmUrl });
    await sendMail({ to: email, subject, html });
  } catch (error) {
    console.error("Confirmation mail failed:", error);
    return {
      status: "error",
      message:
        "Die Bestätigungsmail konnte nicht versendet werden. Bitte versuchen Sie es später noch einmal.",
    };
  }

  return {
    status: "success",
    message:
      "Fast geschafft. Wir haben Ihnen eine E-Mail geschickt — bitte bestätigen Sie darin Ihre Anmeldung.",
  };
}
