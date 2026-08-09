"use server";

import type { ContactState } from "@/lib/form-states";
import { contactEmail, sendMail } from "@/lib/mail";
import { site } from "@/lib/site";

// Same permissive shape as the newsletter: the reply is the real validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX = { name: 120, email: 200, message: 5000 } as const;

export async function contactAction(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Bots fill every field they find, including the hidden one. Answering as
  // though it worked tells them nothing about why nothing arrived.
  if ((formData.get("website") as string)?.trim()) {
    return { status: "success", message: "Danke — Ihre Nachricht ist unterwegs." };
  }

  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, MAX.name);
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, MAX.email);
  const message = String(formData.get("message") ?? "").trim();

  if (!EMAIL_PATTERN.test(email)) {
    return {
      status: "error",
      field: "email",
      message:
        "Bitte geben Sie eine gültige E-Mail-Adresse an — sonst lässt sich Ihnen nicht antworten.",
    };
  }

  if (message.length < 10) {
    return {
      status: "error",
      field: "message",
      message: "Bitte schreiben Sie ein paar Sätze mehr.",
    };
  }

  if (message.length > MAX.message) {
    return {
      status: "error",
      field: "message",
      message: `Die Nachricht ist zu lang — bitte höchstens ${MAX.message.toLocaleString("de-CH")} Zeichen.`,
    };
  }

  try {
    const { subject, html } = contactEmail({ name, email, message });
    // replyTo carries the visitor's address, so a reply in the mail client
    // goes to them rather than back to the site's own mailbox.
    await sendMail({ to: site.email, subject, html, replyTo: email });
  } catch (error) {
    console.error("Contact mail failed:", error);
    return {
      status: "error",
      message: `Die Nachricht konnte nicht versendet werden. Bitte versuchen Sie es später noch einmal oder schreiben Sie direkt an ${site.email}.`,
    };
  }

  return {
    status: "success",
    message:
      "Danke für Ihre Nachricht. Ich melde mich, sobald ich dazu komme — meist innert weniger Tage.",
  };
}
