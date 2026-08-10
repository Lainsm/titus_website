import "server-only";

/*
 * The message matters as much as the throw. This used to say "copy
 * .env.example to .env.local" in every environment — advice that is simply
 * wrong on a server, where `.env.local` is a development convention that the
 * production server never reads, and where the file would be gitignored anyway
 * so it never arrived with the deploy.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    const inProduction = process.env.NODE_ENV === "production";
    throw new Error(
      inProduction
        ? [
            `Missing environment variable ${name}.`,
            `The server is running but has nothing to connect to. Set it either`,
            `in the hosting panel's environment section, or in a .env file placed`,
            `next to package.json. Note that .env.local is NOT read in production,`,
            `and that .env is gitignored — so a deploy from Git never carries one.`,
          ].join(" ")
        : `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
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
