/* =========================================================================
   Titus website — complete schema for MariaDB / MySQL.

   GENERATED FILE. Do not edit: run `npm run db:sql` after changing anything
   in db/migrations/. Built from 2 migration(s): 001_init.sql, 002_rate_limits.sql.

   Import this into an EMPTY database, ideally with phpMyAdmin's Import tab
   (which uploads the file untouched) rather than by pasting into the SQL box.
   Safe to run twice: every statement is CREATE TABLE IF NOT EXISTS.

   Only block comments are used, so the file still works if newlines are
   lost in transit. A -- comment would swallow the statement after it.

   It does NOT create your login — the password is scrypt-hashed, so it
   cannot be typed in by hand. Use `npm run admin:sql` for that INSERT,
   or `npm run admin:create` if you have SSH.
   ========================================================================= */

SET NAMES utf8mb4;
SET time_zone = '+00:00';

/* Bookkeeping table, so `npm run db:migrate` knows this schema is applied. */
CREATE TABLE IF NOT EXISTS _migrations (
  name       VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ======================== 001_init.sql ======================== */

/* Initial schema for the Titus website. MariaDB / MySQL. */
/* */
/* Notes on the port from PostgreSQL, because the differences are not cosmetic: */
/* */
/*  * MariaDB cannot index a TEXT column without a prefix length, so every */
/*    column that carries a PRIMARY KEY, UNIQUE or INDEX is a sized VARCHAR. */
/*    The widths are chosen from what actually goes in them: a SHA-256 hex */
/*    digest is 64 characters, a base64url token of 32 bytes is 43. */
/*  * There are no partial indexes. The Postgres schema had */
/*    `UNIQUE (confirm_token) WHERE confirm_token IS NOT NULL`; MariaDB allows */
/*    any number of NULLs in a UNIQUE index already, so a plain one is exactly */
/*    equivalent here. */
/*  * DATETIME has no time zone. Everything is written and read as UTC — the */
/*    connection sets time_zone = '+00:00' (see src/lib/db.ts), so NOW() is UTC */
/*    and JS Date values round-trip without shifting. */
/*  * utf8mb4 throughout, or German text with an emoji in it truncates. */

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Session tokens are stored as SHA-256 hashes; the raw token lives only in the */
/* browser cookie, so a database leak cannot be replayed as a login. */
CREATE TABLE IF NOT EXISTS sessions (
  token_hash VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id    INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX sessions_user_id_idx (user_id),
  INDEX sessions_expires_at_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  slug         VARCHAR(255) NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  subtitle     TEXT NOT NULL DEFAULT '',
  category     VARCHAR(32) NOT NULL DEFAULT 'erzaehlung',
  lead         TEXT NOT NULL DEFAULT '',
  body_html    LONGTEXT NOT NULL DEFAULT '',
  word_count   INT NOT NULL DEFAULT 0,
  status       VARCHAR(16) NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT posts_category_chk
    CHECK (category IN ('erzaehlung', 'essay', 'kommentar', 'notiz')),
  CONSTRAINT posts_status_chk CHECK (status IN ('draft', 'published')),
  INDEX posts_published_idx (status, published_at DESC),
  INDEX posts_category_idx (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Editable standing pages (Über, Impressum, Datenschutz). */
CREATE TABLE IF NOT EXISTS pages (
  slug       VARCHAR(255) NOT NULL PRIMARY KEY,
  title      TEXT NOT NULL,
  body_html  LONGTEXT NOT NULL DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       TEXT NOT NULL,
  subtitle    TEXT NOT NULL DEFAULT '',
  publisher   TEXT NOT NULL DEFAULT '',
  year        INT NULL,
  kind        VARCHAR(32) NOT NULL DEFAULT 'buch',
  description TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',
  isbn        VARCHAR(32) NOT NULL DEFAULT '',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT publications_kind_chk
    CHECK (kind IN ('buch', 'beitrag', 'artikel', 'vortrag')),
  INDEX publications_sort_idx (sort_order, year DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscribers (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  email             VARCHAR(255) NOT NULL UNIQUE,
  name              VARCHAR(255) NOT NULL DEFAULT '',
  status            VARCHAR(16) NOT NULL DEFAULT 'pending',
  confirm_token     VARCHAR(64) NULL UNIQUE,
  unsubscribe_token VARCHAR(64) NOT NULL UNIQUE,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at      DATETIME NULL,
  unsubscribed_at   DATETIME NULL,
  CONSTRAINT subscribers_status_chk
    CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  INDEX subscribers_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletters (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  subject      TEXT NOT NULL DEFAULT '',
  intro        TEXT NOT NULL DEFAULT '',
  body_html    LONGTEXT NOT NULL DEFAULT '',
  status       VARCHAR(16) NOT NULL DEFAULT 'draft',
  sent_at      DATETIME NULL,
  sent_count   INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT newsletters_status_chk
    CHECK (status IN ('draft', 'sending', 'sent', 'failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* One row per recipient, so a retry never sends the same issue twice. */
CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  newsletter_id INT NOT NULL,
  subscriber_id INT NOT NULL,
  status        VARCHAR(16) NOT NULL,
  error         TEXT NOT NULL DEFAULT '',
  sent_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (newsletter_id, subscriber_id),
  CONSTRAINT deliveries_status_chk CHECK (status IN ('sent', 'failed')),
  CONSTRAINT deliveries_newsletter_fk FOREIGN KEY (newsletter_id)
    REFERENCES newsletters(id) ON DELETE CASCADE,
  CONSTRAINT deliveries_subscriber_fk FOREIGN KEY (subscriber_id)
    REFERENCES subscribers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Throttles brute-force login attempts without needing Redis. */
CREATE TABLE IF NOT EXISTS auth_attempts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  identifier   VARCHAR(255) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX auth_attempts_idx (identifier, attempted_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ======================== 002_rate_limits.sql ======================== */

/* Rate limiting for the endpoints anyone on the internet can reach: the */
/* newsletter sign-up and the contact form. Both send mail, so without a limit */
/* they are an open relay pointed at the author's own mailbox. */
/* */
/* auth_attempts already does this job for the login form, but it is keyed to */
/* an account identifier and carries login semantics. Keeping the public */
/* buckets separate means a flood of contact-form spam can never lock anyone */
/* out of the back office. */

CREATE TABLE IF NOT EXISTS rate_limits (
  id     BIGINT AUTO_INCREMENT PRIMARY KEY,
  bucket VARCHAR(255) NOT NULL,
  hit_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX rate_limits_bucket_idx (bucket, hit_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Record the migrations as applied, so db:migrate does not repeat them. */
INSERT IGNORE INTO _migrations (name) VALUES ('001_init.sql');
INSERT IGNORE INTO _migrations (name) VALUES ('002_rate_limits.sql');

