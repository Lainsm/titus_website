import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get siteUrl() {
    return optional("SITE_URL", "http://localhost:3000").replace(/\/+$/, "");
  },
  get smtp() {
    return {
      host: optional("SMTP_HOST"),
      port: Number(optional("SMTP_PORT", "587")),
      user: optional("SMTP_USER"),
      password: optional("SMTP_PASSWORD"),
      from: optional("MAIL_FROM", optional("SMTP_USER")),
      replyTo: optional("MAIL_REPLY_TO") || undefined,
      throttleMs: Number(optional("MAIL_THROTTLE_MS", "1200")),
    };
  },
  get mailConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
