import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";
import { site } from "./site";
import { htmlToText } from "./typography";

const globalForMail = globalThis as unknown as { __titusMail?: Transporter };

function transporter(): Transporter {
  if (!globalForMail.__titusMail) {
    const { host, port, user, password } = env.smtp;
    globalForMail.__titusMail = nodemailer.createTransport({
      host,
      port,
      // Infomaniak uses STARTTLS on 587 and implicit TLS on 465.
      secure: port === 465,
      auth: user ? { user, pass: password } : undefined,
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
    });
  }
  return globalForMail.__titusMail;
}

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Overrides the configured Reply-To. The contact form points it at the
      sender, so hitting reply in the mail client answers them directly. */
  replyTo?: string;
  /** Adds List-Unsubscribe headers so Gmail shows a native unsubscribe link. */
  unsubscribeUrl?: string;
};

export async function sendMail(input: MailInput): Promise<void> {
  if (!env.mailConfigured) {
    // In development without SMTP credentials, log instead of failing so the
    // whole opt-in flow can still be exercised.
    console.info(
      `\n── E-Mail (SMTP nicht konfiguriert) ─────────────\nAn: ${input.to}\nBetreff: ${input.subject}\n\n${htmlToText(input.html)}\n────────────────────────────────────────────────\n`,
    );
    return;
  }

  const { from, replyTo } = env.smtp;

  await transporter().sendMail({
    from,
    to: input.to,
    replyTo: input.replyTo ?? replyTo,
    subject: input.subject,
    html: input.html,
    text: input.text ?? htmlToText(input.html),
    headers: input.unsubscribeUrl
      ? {
          "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined,
  });
}

/** Verifies the SMTP credentials without sending anything. */
export async function verifyMailConnection(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!env.mailConfigured) {
    return { ok: false, error: "SMTP is not configured (see .env.local)." };
  }
  try {
    await transporter().verify();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Email clients ignore most modern CSS, so this uses a single centred table
 * with inline styles and a Helvetica/Georgia stack — no webfonts.
 */
export function emailLayout(options: {
  preheader?: string;
  title?: string;
  bodyHtml: string;
  footerHtml?: string;
}): string {
  const { preheader = "", title = "", bodyHtml, footerHtml = "" } = options;

  return `<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title || site.name)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f3f0;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e0da;">
        <tr>
          <td style="padding:36px 40px 8px 40px;border-bottom:2px solid #16110f;">
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#16110f;font-weight:700;">
              ${escapeHtml(site.name)}
            </div>
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.06em;color:#7a736c;padding-top:4px;padding-bottom:20px;">
              ${escapeHtml(site.tagline)}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.65;color:#16110f;">
            ${title ? `<h1 style="margin:0 0 20px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.01em;color:#16110f;">${escapeHtml(title)}</h1>` : ""}
            ${bodyHtml}
          </td>
        </tr>
        ${
          footerHtml
            ? `<tr>
          <td style="padding:20px 40px 28px 40px;border-top:1px solid #e2e0da;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#7a736c;">
            ${footerHtml}
          </td>
        </tr>`
            : ""
        }
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

const buttonHtml = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0;">
     <tr><td style="background:#16110f;">
       <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
     </td></tr>
   </table>`;

export function confirmationEmail(options: {
  name: string;
  confirmUrl: string;
}): { subject: string; html: string } {
  const greeting = options.name
    ? `Guten Tag ${escapeHtml(options.name)}`
    : "Guten Tag";

  return {
    subject: `Bitte bestätigen Sie Ihre Anmeldung`,
    html: emailLayout({
      preheader: "Ein Klick noch, dann sind Sie angemeldet.",
      title: "Anmeldung bestätigen",
      bodyHtml: `
        <p style="margin:0 0 16px 0;">${greeting}</p>
        <p style="margin:0 0 16px 0;">
          Sie haben sich für den Newsletter von ${escapeHtml(site.name)} angemeldet.
          Bitte bestätigen Sie Ihre E-Mail-Adresse mit einem Klick:
        </p>
        ${buttonHtml(options.confirmUrl, "Anmeldung bestätigen")}
        <p style="margin:0 0 16px 0;font-size:14px;color:#5c554e;">
          Falls der Knopf nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:<br>
          <a href="${escapeHtml(options.confirmUrl)}" style="color:#16110f;word-break:break-all;">${escapeHtml(options.confirmUrl)}</a>
        </p>
      `,
      footerHtml: `Wenn Sie sich nicht angemeldet haben, können Sie diese Nachricht einfach löschen. Es wird nichts gespeichert.`,
    }),
  };
}

/**
 * The contact form's own notification, addressed to the author. The visitor's
 * words are escaped and their line breaks kept — this is the one template
 * whose body comes from outside, so nothing in it may be trusted as markup.
 */
export function contactEmail(options: {
  name: string;
  email: string;
  message: string;
}): { subject: string; html: string } {
  const rows: [string, string][] = [
    ["Name", options.name || "—"],
    ["E-Mail", options.email],
  ];

  return {
    subject: `Nachricht über die Website — ${options.name || options.email}`,
    html: emailLayout({
      preheader: options.message.slice(0, 120),
      title: "Nachricht über das Kontaktformular",
      bodyHtml: `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
          ${rows
            .map(
              ([label, value]) => `<tr>
            <td style="padding:0 16px 6px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.06em;color:#5c544b;white-space:nowrap;">${escapeHtml(label)}</td>
            <td style="padding:0 0 6px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:#16110f;">${escapeHtml(value)}</td>
          </tr>`,
            )
            .join("")}
        </table>
        <div style="padding-top:20px;border-top:1px solid #e2e0da;white-space:pre-wrap;">${escapeHtml(options.message)}</div>
      `,
      footerHtml: `Antworten geht direkt an ${escapeHtml(options.email)}.`,
    }),
  };
}

/**
 * Mail clients strip <style> blocks, so every tag in the body needs its own
 * inline styles. The editor produces a small, known set of tags.
 */
const EMAIL_TAG_STYLES: Record<string, string> = {
  p: "margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.65;color:#16110f;",
  h2: "margin:32px 0 12px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:20px;line-height:1.3;font-weight:700;color:#16110f;",
  h3: "margin:28px 0 10px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;color:#16110f;",
  h4: "margin:24px 0 10px 0;font-family:Georgia,serif;font-style:italic;font-size:17px;color:#16110f;",
  blockquote:
    "margin:22px 0;padding:0 0 0 18px;border-left:2px solid #cb9e59;font-family:Georgia,serif;font-style:italic;font-size:17px;line-height:1.6;color:#443d37;",
  ul: "margin:0 0 18px 0;padding-left:22px;font-family:Georgia,serif;font-size:17px;line-height:1.65;color:#16110f;",
  ol: "margin:0 0 18px 0;padding-left:22px;font-family:Georgia,serif;font-size:17px;line-height:1.65;color:#16110f;",
  li: "margin-bottom:6px;",
  a: "color:#16110f;text-decoration:underline;",
  hr: "border:0;border-top:1px solid #e2e0da;margin:28px 0;width:60px;",
  strong: "font-weight:700;",
  em: "font-style:italic;",
};

export function styleForEmail(html: string): string {
  return html.replace(/<([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag: string, attrs = "") => {
    const style = EMAIL_TAG_STYLES[tag.toLowerCase()];
    if (!style) return match;
    // Don't clobber a style the author's markup already carries.
    if (/\sstyle\s*=/i.test(attrs)) return match;
    return `<${tag}${attrs} style="${style}">`;
  });
}

export function newsletterEmail(options: {
  subject: string;
  intro: string;
  bodyHtml: string;
  unsubscribeUrl: string;
}): string {
  return emailLayout({
    preheader: options.intro,
    title: options.subject,
    bodyHtml: options.bodyHtml,
    footerHtml: `
      Sie erhalten diese Nachricht, weil Sie den Newsletter von ${escapeHtml(site.name)} abonniert haben.<br>
      <a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#7a736c;">Newsletter abbestellen</a>
    `,
  });
}
