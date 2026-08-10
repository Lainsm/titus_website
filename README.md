# Titus Lainsbury — Website

A personal publishing site for a Swiss-German author: stories, essays and
commentary in German, a newsletter with double opt-in, and a private editorial
area where new texts are written and published.

Built with Next.js 16 (App Router), MariaDB and plain CSS. No analytics, no
third-party fonts, no tracking cookies — everything is served from one server.

---

## Table of contents

1. [Running it locally](#running-it-locally)
2. [Deploying to Infomaniak](#deploying-to-infomaniak)
3. [Environment variables](#environment-variables)
4. [How the site is put together](#how-the-site-is-put-together)
5. [Typography and design notes](#typography-and-design-notes)
6. [Tests](#tests)
7. [Anleitung für den Autor](#anleitung-für-den-autor) (in German)

---

## Running it locally

You need Node 20.12 or newer and a MariaDB (or MySQL) database.

```bash
brew install mariadb && brew services start mariadb   # macOS; any MariaDB will do
mysql -u root -e "CREATE DATABASE titus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
                  CREATE USER 'titus'@'localhost' IDENTIFIED BY 'titus';
                  GRANT ALL ON titus.* TO 'titus'@'localhost';"

npm install
cp .env.example .env.local        # then fill in DATABASE_URL
npm run db:migrate                # creates the tables
npm run admin:create -- titus@example.ch "Titus Bihl"
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

### One product, one bill

The app runs on Infomaniak's **web hosting with Node.js**, and uses the
**MariaDB** database that comes with that same subscription. Nothing else to rent:
no Public Cloud, no managed database service, no VPS to patch.

That is why the app is written against MariaDB rather than PostgreSQL — the
bundled database is MySQL/MariaDB, and matching it keeps the whole site on one
product. Create the database in the Manager's **Databases** section and paste
its host, name and credentials into `DATABASE_URL`.

The database is **not** on the same machine as the app: Infomaniak hands you a
hostname like `483sm8.myd.infomaniak.com` on port 3306, reached over their
internal network. So `DATABASE_URL` looks like

```
mysql://user:password@483sm8.myd.infomaniak.com:3306/dbname
```

Start with `DB_SSL=0`. Infomaniak's shared MySQL does not advertise TLS on this
service, and turning it on when the server does not offer it fails the
connection outright. If you later move the database somewhere that does support
TLS, set `DB_SSL=1` — the certificate is then verified, and `DB_SSL_CA` takes
the provider's PEM if their CA is not in the system trust store.

Two things to check on that page if the connection is refused: that the
database user is allowed to connect from the web hosting (Infomaniak restricts
this per user), and that you are using the database's own user, not your
Infomaniak account login.

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
command** to `npm run build:deploy`. Node must be **20.12 or newer** (the
scripts use `--env-file-if-exists`).

> **`.env.local` is not read by the standalone server.** It is a development
> convenience only. Every variable in `.env.example` has to be set in the
> Infomaniak dashboard's environment section, or the server starts and then
> returns 500 on the first request that touches the database.

### Environment variables that are easy to miss

| Variable | Why it matters |
| --- | --- |
| `SITE_URL` | Two jobs. It builds every confirmation and unsubscribe link, **and** it is the origin Next.js allows Server Actions from (`serverActions.allowedOrigins` in `next.config.ts`). Behind Infomaniak's reverse proxy the host Next sees is not the one the browser used, so if this is wrong or unset every form on the site fails its CSRF check. It must be set for `npm run build:deploy` as well as at runtime. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Next encrypts the variables a Server Action closes over. Left unset it invents a new key per build, so a reader who was mid-submit across a deploy gets "Failed to find Server Action". Generate once with `openssl rand -base64 32` and keep it. Needed at build **and** run time. |
| `DB_SSL` / `DB_SSL_CA` | Leave `DB_SSL=0` on Infomaniak. The database has its own hostname (`…myd.infomaniak.com:3306`) but that shared MySQL service does not offer TLS, and enabling it fails the connection. Set it to `1` only if the database moves somewhere that supports TLS; the certificate is then verified, and `DB_SSL_CA` takes the provider's PEM if their CA is not in the system store. `DB_SSL_INSECURE=1` turns verification off — it encrypts but authenticates nothing. |

### First run on the server

If you have SSH (Infomaniak's Node.js hosting does):

```bash
npm run db:migrate
npm run admin:create -- titus@bihl.ch "Titus Bihl"
```

**Or, with only phpMyAdmin.** Do not import `db/migrations/001_init.sql` on its
own — it is the first migration, not the whole schema, and a database built
from it alone is missing `rate_limits`, so the contact form and the newsletter
sign-up both fail on their first request. Generate the complete file instead:

```bash
npm run db:sql        # writes db/install.sql from every migration
```

Import that into an **empty** database (phpMyAdmin → Import). It is safe to run
twice, and it records the migrations as applied so a later `npm run db:migrate`
over SSH does not try to repeat them.

The login cannot be created by hand, because the password column holds a salted
scrypt hash rather than the password. Generate that INSERT locally and paste it
into phpMyAdmin → SQL:

```bash
npm run admin:sql -- titus@bihl.ch "Titus Bihl"
```

`db/install.sql` is generated — re-run `npm run db:sql` after adding any
migration, or it will fall behind `db/migrations/`.

### Checklist before going live

- [ ] `SITE_URL` is the real `https://` domain, with no trailing slash — every
      confirmation and unsubscribe link is built from it, and Server Actions
      are refused from any other origin.
- [ ] `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is set, and is the same value used
      for the build and for the running process.
- [ ] `DB_SSL=1` **only** if the database is on a different host than the app,
      with `DB_SSL_CA` if the provider's CA is not in the system trust store.
      On Infomaniak's own hosting it stays `0`.
- [ ] HTTPS is live **before** the domain is public. The app sends
      `Strict-Transport-Security` with a two-year max-age, which a browser
      remembers — serving plain HTTP afterwards will fail for anyone who has
      already visited.
- [ ] Submit the contact form and the newsletter form once on the real domain.
      Both are rate limited (5 per 15 minutes per address, 60 per hour
      overall); if `SITE_URL` is wrong they fail instead with a CSRF error.
- [ ] Press the unsubscribe button in a real Gmail message, not just the link
      in the mail body — that exercises the one-click `POST` endpoint at
      `/newsletter/abmelden/api`.
- [ ] SMTP credentials are set and the **Send a test to myself** button in
      *Newsletter* delivers a real message.
- [ ] SPF and DKIM are configured for the sending domain in the Infomaniak
      manager. Without them the newsletter will land in spam.
- [ ] The Impressum page has real contact details (Editorial → Pages).
- [ ] A database backup runs on a schedule.

### Notes from the PostgreSQL → MariaDB port

The app was originally written against PostgreSQL. The differences that
actually mattered, in case any of them ever bites again:

- `src/lib/db.ts` rewrites Postgres-style `$1` placeholders to `?` on the way
  through, so the ~190 call sites kept their SQL. Only genuinely dialect-specific
  statements were touched.
- MariaDB cannot index a `TEXT` column without a prefix length, so every
  indexed column is a sized `VARCHAR`.
- `RETURNING id` became `insert()` in `db.ts`, which returns `insertId`.
- `ON CONFLICT … DO UPDATE` → `ON DUPLICATE KEY UPDATE … VALUES(col)`;
  `DO NOTHING` → `INSERT IGNORE`.
- `now() - interval '15 minutes'` → `NOW() - INTERVAL 15 MINUTE`;
  `count(*)::text` → `CAST(COUNT(*) AS CHAR)`; `NULLS LAST` is implicit in
  `DESC` and was simply dropped.
- Partial unique indexes have no equivalent, but MariaDB already allows any
  number of `NULL`s in a `UNIQUE` index, so the behaviour carried over.
- `DATETIME` has no time zone: the pool sets `time_zone = '+00:00'` and passes
  `timezone: "Z"`, so everything is stored and read as UTC.
- `TEXT` columns need their `DEFAULT ''` stated explicitly, or a partial
  `INSERT` fails under strict mode. `npm run test:db` caught exactly that.

---

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MariaDB/MySQL connection string, e.g. `mysql://user:pass@host:3306/db`. Required. |
| `DB_SSL` | `1` only if the database host supports TLS. Off for Infomaniak's shared MySQL. |
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
  db.ts              pooled MariaDB access ($1 → ? translation lives here)
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
npm run test:db           # 37 checks running the real schema against a scratch MariaDB
npm run typecheck
npm run lint
```

`test:db` creates `<your db>_smoketest`, migrates it, asserts against it and
drops it again, so your development data is never touched. It needs no
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
