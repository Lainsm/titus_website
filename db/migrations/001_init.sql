-- Initial schema for the Titus website.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session tokens are stored as SHA-256 hashes; the raw token lives only in the
-- browser cookie, so a database leak cannot be replayed as a login.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS posts (
  id              SERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  subtitle        TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT 'erzaehlung'
                    CHECK (category IN ('erzaehlung', 'essay', 'kommentar', 'notiz')),
  lead            TEXT NOT NULL DEFAULT '',
  body_html       TEXT NOT NULL DEFAULT '',
  word_count      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published')),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_published_idx
  ON posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS posts_category_idx ON posts(category);

-- Editable standing pages (Über, Impressum, Datenschutz).
CREATE TABLE IF NOT EXISTS pages (
  slug       TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body_html  TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publications (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  subtitle    TEXT NOT NULL DEFAULT '',
  publisher   TEXT NOT NULL DEFAULT '',
  year        INTEGER,
  kind        TEXT NOT NULL DEFAULT 'buch'
                CHECK (kind IN ('buch', 'beitrag', 'artikel', 'vortrag')),
  description TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',
  isbn        TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS publications_sort_idx
  ON publications(sort_order, year DESC);

CREATE TABLE IF NOT EXISTS subscribers (
  id                 SERIAL PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  confirm_token      TEXT,
  unsubscribe_token  TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at       TIMESTAMPTZ,
  unsubscribed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS subscribers_status_idx ON subscribers(status);
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_confirm_token_idx
  ON subscribers(confirm_token) WHERE confirm_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_unsubscribe_token_idx
  ON subscribers(unsubscribe_token);

CREATE TABLE IF NOT EXISTS newsletters (
  id           SERIAL PRIMARY KEY,
  subject      TEXT NOT NULL DEFAULT '',
  intro        TEXT NOT NULL DEFAULT '',
  body_html    TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  sent_at      TIMESTAMPTZ,
  sent_count   INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per recipient, so a retry never sends the same issue twice.
CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  newsletter_id INTEGER NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error         TEXT NOT NULL DEFAULT '',
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (newsletter_id, subscriber_id)
);

-- Throttles brute-force login attempts without needing Redis.
CREATE TABLE IF NOT EXISTS auth_attempts (
  id           SERIAL PRIMARY KEY,
  identifier   TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_attempts_idx
  ON auth_attempts(identifier, attempted_at DESC);
