-- Press coverage: what other people wrote about him.
--
-- Deliberately not a `kind` on `publications`. That table holds work he wrote;
-- this one holds work written about him. Merging them would read as one list
-- to a visitor and, worse, would collapse two different claims in the
-- structured data — his own works against schema.org's `subjectOf`.

CREATE TABLE IF NOT EXISTS press (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  -- The publication that ran it: "Freiburger Nachrichten", "SRF 2 Kultur".
  outlet       TEXT NOT NULL,
  -- The headline of the piece, not a description of it.
  title        TEXT NOT NULL,
  url          TEXT NOT NULL DEFAULT '',
  /*
   * A DATE, not a DATETIME. A press piece is dated to the day, and a date with
   * no time carries no time zone to get wrong — which is what turned the
   * publication date of a text into a moving target.
   */
  published_at DATE NULL,
  kind         VARCHAR(32) NOT NULL DEFAULT 'artikel',
  /*
   * One sentence lifted from the piece. This is what makes the section
   * readable rather than a list of outlet names — and it is what the entry
   * still says once the link behind it dies, which newspaper links do.
   */
  quote        TEXT NOT NULL DEFAULT '',
  /* A snapshot (archive.org) for when the original moves or goes behind a
     paywall. Fribourg is bilingual, so the language is worth recording too. */
  archive_url  TEXT NOT NULL DEFAULT '',
  language     VARCHAR(5) NOT NULL DEFAULT 'de',
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT press_kind_chk
    CHECK (kind IN ('artikel', 'interview', 'portraet', 'rezension', 'radio')),
  INDEX press_sort_idx (sort_order, published_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
