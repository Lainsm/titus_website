# Titus Lainsbury — Website

A personal publishing site for a Swiss-German author: stories, essays and
commentary in German, a newsletter with double opt-in, and a private editorial
area where new texts are written and published.

Built with Next.js 16 (App Router), PostgreSQL and plain CSS. No analytics, no
third-party fonts, no tracking cookies — everything is served from one server.

---

## Table of contents

1. [Running it locally](#running-it-locally)
2. [Deploying to Infomaniak](#deploying-to-infomaniak) ← **read the note about PostgreSQL**
3. [Environment variables](#environment-variables)
4. [How the site is put together](#how-the-site-is-put-together)
5. [Typography and design notes](#typography-and-design-notes)
6. [Tests](#tests)
7. [Anleitung für den Autor](#anleitung-für-den-autor) (in German)

---

## Running it locally

You need Node 20 or newer and a PostgreSQL database.

```bash
npm install
cp .env.example .env.local        # then fill in DATABASE_URL
npm run db:migrate                # creates the tables
npm run admin:create -- titus@example.ch "Titus Lainsbury"
npm run db:seed                   # optional: three sample texts, so there is something to look at
npm run dev
```

Then open <http://localhost:3000>, and <http://localhost:3000/admin/login> to
sign in.

Without SMTP settings the site still works: confirmation mails and newsletters
are printed to the terminal instead of being sent, so the whole opt-in flow can
be tried out before any mailbox exists.

---

## Deploying to Infomaniak

### An honest note about PostgreSQL first

Infomaniak's **managed Node.js hosting** is a good fit for this app — it gives
you SSH, npm, Git deployment, a chosen Node version and a dashboard to
start/stop the process. But the database it includes is **MariaDB, not
PostgreSQL**. This app is written against PostgreSQL, which you chose.

That leaves three options:

| Option | What it means |
| --- | --- |
| **A. Infomaniak Public Cloud** (recommended) | An OpenStack VM in Geneva or Winterthur. You run both Postgres and the app on it. Full control, still entirely Swiss, but you patch and back up the machine yourself. |
| **B. Node.js hosting + Postgres elsewhere** | Keep the managed Node.js hosting and point `DATABASE_URL` at a Postgres you run or rent separately. Simplest operationally, but the database may leave Infomaniak unless they offer a managed Postgres on your plan — worth one support ticket to confirm. |
| **C. Port the app to MariaDB** | Stay entirely on the standard Node.js hosting. See [Switching to MariaDB](#switching-to-mariadb) below for what that costs. |

Nothing in the application logic depends on the choice — only the database
driver and the SQL dialect do.

### Building for upload

```bash
npm run build:deploy
```

This produces `.next/standalone`, a self-contained Node server with the static
assets and fonts copied in. Upload that folder (plus `db/` and `scripts/` if
you want to run migrations on the server), then start it with:

```bash
node server.js
```

It listens on `PORT` (Infomaniak sets this for you) and `HOSTNAME`. In the
Infomaniak dashboard set the **entry point** to `server.js` and the **build
command** to `npm run build:deploy`.

### First run on the server

```bash
npm run db:migrate
npm run admin:create -- titus@example.ch "Titus Lainsbury"
```

### Checklist before going live

- [ ] `SITE_URL` is the real `https://` domain, with no trailing slash — every
      confirmation and unsubscribe link is built from it.
- [ ] `PGSSLMODE=require` if the database is on a different host than the app.
- [ ] SMTP credentials are set and the **Send a test to myself** button in
      *Newsletter* delivers a real message.
- [ ] SPF and DKIM are configured for the sending domain in the Infomaniak
      manager. Without them the newsletter will land in spam.
- [ ] The Impressum page has real contact details (Editorial → Pages).
- [ ] A database backup runs on a schedule.

### Switching to MariaDB

All the SQL lives in `db/migrations/001_init.sql`, `src/lib/`, the `actions.ts`
files under `src/app/`, and the admin pages that query directly. Moving to
MariaDB means:

- `SERIAL` → `INT AUTO_INCREMENT`, `TIMESTAMPTZ` → `DATETIME`
- `$1, $2` placeholders → `?`
- `ON CONFLICT … DO UPDATE` → `ON DUPLICATE KEY UPDATE`
- `now() - interval '15 minutes'` → `NOW() - INTERVAL 15 MINUTE`
- partial unique indexes (`… WHERE confirm_token IS NOT NULL`) have no direct
  equivalent and need handling in application code
- swap `pg` for `mysql2` in `src/lib/db.ts`

Half a day of careful work, and `npm run test:db` will tell you when it is right.

---

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Required. |
| `PGSSLMODE` | Set to `require` when the database is on another host. |
| `SITE_URL` | Public base URL, no trailing slash. Used for every link in outgoing mail. |
| `SMTP_HOST` | `mail.infomaniak.com` |
| `SMTP_PORT` | `587` (STARTTLS) or `465` (implicit TLS) |
| `SMTP_USER` / `SMTP_PASSWORD` | An Infomaniak mailbox and its password. |
| `MAIL_FROM` | Sender, e.g. `Titus Lainsbury <noreply@example.ch>`. Must match the SMTP domain. |
| `MAIL_REPLY_TO` | Where replies to the newsletter should go. |
| `MAIL_THROTTLE_MS` | Pause between messages. `1200` ≈ 50 mails/minute. |

---

## How the site is put together

```
db/migrations/       schema, applied in filename order
scripts/             migrate, seed, create-admin, tests, packaging
src/app/
  page.tsx           home — statement, latest text, register
  texte/             the register and the individual texts
  publikationen/     books, articles, talks
  ueber/ impressum/ datenschutz/   editable standing pages
  newsletter/        sign-up, confirmation, unsubscribe
  admin/
    login/           sign-in (outside the guard)
    (app)/           everything behind the session check
  feed.xml/ sitemap.ts robots.ts
src/components/      shared UI, including the Tiptap editor
src/lib/
  db.ts              pooled Postgres access
  auth.ts            scrypt passwords, hashed session tokens, login throttling
  typography.ts      Swiss-German typographic rules
  slug.ts            German-aware URL slugs
  sanitize.ts        HTML whitelist for anything the editor produces
  mail.ts            SMTP transport and e-mail templates
  site.ts            the author's name, categories, date formats
src/proxy.ts         optimistic /admin gate (was middleware.ts before Next 16)
```

### Security

- Passwords are hashed with **scrypt** and a per-password salt.
- Session tokens are random 32-byte values; only their **SHA-256 hash** is
  stored, so a database leak cannot be replayed as a login.
- Every admin page checks the session, and **every Server Action checks it
  again** — Server Actions are reachable by direct POST, so the layout guard
  alone would not be enough.
- `src/proxy.ts` turns away cookie-less requests to `/admin` early, but it is
  deliberately only an optimisation, not the real check.
- Login attempts are throttled to 8 per 15 minutes per address, and a missing
  account takes the same time as a wrong password.
- All prose is run through a **tag whitelist** before it is stored.
- The newsletter sign-up uses **double opt-in** with a single-use token, and a
  honeypot field catches simple bots.

### Newsletter sending

Sending is done in batches sized to finish comfortably inside one request.
Each delivery is recorded in `newsletter_deliveries`, keyed on
`(newsletter_id, subscriber_id)`, so pressing send again **resumes** rather
than sending a second copy — even after a crash or a closed browser tab. This
is covered by `npm run test:db`.

Every message carries `List-Unsubscribe` headers, so Gmail and Apple Mail show
their own unsubscribe button.

---

## Typography and design notes

The design follows the Swiss International Typographic Style: a 12-column
grid, flush-left ragged-right text, hairline rules, one accent colour, and no
ornament. Structure and metadata are set in a neo-grotesque (Inter); the prose
itself is set in a serif (Source Serif 4) because long German paragraphs read
better that way. Both are self-hosted in `public/fonts` — nothing is fetched
from Google.

German text needs care that English does not, so:

- `lang="de-CH"` on `<html>` selects the German hyphenation dictionary.
  Without hyphenation, compounds like *Selbstverständlichkeit* tear holes in a
  ragged-right column.
- Quotation marks become **«guillemets»**, and nested ones **‹chevrons›** —
  the Swiss convention, not the German „Gänsefüsschen".
- **ß is rewritten to ss**, which is Swiss orthography.
- `z. B.`, `5 km` and `§ 12` are held together with non-breaking spaces.
- ` -- ` and ` - ` become en dashes; `1914-1918` becomes `1914–1918`.

These run at render time (`src/lib/typography.ts`), never on save, so the
author's original text is never altered and the rules can be changed later.
The author simply types ordinary straight quotes.

To change the author's name, the categories or the tagline, edit
`src/lib/site.ts`. To turn off the ß rule, remove the one line in
`refineText()` in `src/lib/typography.ts`.

---

## Tests

```bash
npm test              # both suites
npm run test:typography   # 32 checks on the German typographic rules and slugs
npm run test:db           # 28 checks running the real schema in an in-process Postgres
npm run typecheck
npm run lint
```

`test:db` uses PGlite, a WebAssembly build of PostgreSQL, so it needs no
database server. It exercises the real migration file and the real queries:
draft/publish visibility, future-dated posts, the double opt-in flow, the
batched send, and the guarantee that nobody is mailed twice.

---

## Anleitung für den Autor

**Anmelden:** `deine-domain.ch/admin/login`

**Einen Text schreiben**

1. *Texts* → *New text*.
2. Titel eingeben. Der Untertitel und der Lead sind freiwillig — der Lead ist
   das, was im Register und im Newsletter erscheint.
3. Den Text schreiben. Anführungszeichen ganz normal als `"…"` tippen; auf der
   Website werden daraus automatisch «…».
4. *Save* speichert als Entwurf. Niemand sieht ihn.
5. *Publish* stellt ihn online.

Ein Datum in der Zukunft hält den Text zurück, bis dieser Zeitpunkt erreicht
ist. *Unpublish* nimmt ihn wieder von der Website.

**Newsletter verschicken**

1. *Newsletter* → *Write an issue*.
2. Betreff und ein paar Sätze, dazu den Link auf den neuen Text.
3. *Save draft*, dann *Send a test to myself* — und die Testmail wirklich
   anschauen.
4. Erst dann *Send to N subscribers*. Das Fenster offen lassen, bis es fertig
   ist.

Verschickt wird nur an Personen, die ihre Adresse bestätigt haben. Ein zweites
Mal auf *Send* zu drücken schickt niemandem eine zweite Nachricht — es macht
nur dort weiter, wo es aufgehört hat.

**Seiten ändern:** *Pages* → *Über*, *Impressum* oder *Datenschutz*. Diese
Seiten sind sofort nach dem Speichern online.
