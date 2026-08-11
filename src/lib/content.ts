import "server-only";
import { query, queryOne } from "./db";

export type PostStatus = "draft" | "published";

export type Post = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  lead: string;
  body_html: string;
  word_count: number;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PostSummary = Omit<Post, "body_html">;

const SUMMARY_COLUMNS = `
  id, slug, title, subtitle, category, lead, word_count,
  status, published_at, created_at, updated_at
`;

/* -------------------------------------------------------------------------- */
/* Posts — public reads                                                        */
/* -------------------------------------------------------------------------- */

export async function listPublishedPosts(options: {
  category?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<PostSummary[]> {
  const { category, limit = 50, offset = 0 } = options;

  if (category) {
    return query<PostSummary>(
      `SELECT ${SUMMARY_COLUMNS} FROM posts
        WHERE status = 'published' AND published_at <= now() AND category = $1
        ORDER BY published_at DESC
        LIMIT $2 OFFSET $3`,
      [category, limit, offset],
    );
  }

  return query<PostSummary>(
    `SELECT ${SUMMARY_COLUMNS} FROM posts
      WHERE status = 'published' AND published_at <= now()
      ORDER BY published_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
}

export async function getPublishedPost(slug: string): Promise<Post | null> {
  return queryOne<Post>(
    `SELECT * FROM posts
      WHERE slug = $1 AND status = 'published' AND published_at <= now()`,
    [slug],
  );
}

/** Previous (older) and next (newer) text, for the reading trail. */
export async function getNeighbours(post: {
  published_at: string | null;
}): Promise<{ older: PostSummary | null; newer: PostSummary | null }> {
  const [older, newer] = await Promise.all([
    queryOne<PostSummary>(
      `SELECT ${SUMMARY_COLUMNS} FROM posts
        WHERE status = 'published' AND published_at < $1
        ORDER BY published_at DESC LIMIT 1`,
      [post.published_at],
    ),
    queryOne<PostSummary>(
      `SELECT ${SUMMARY_COLUMNS} FROM posts
        WHERE status = 'published' AND published_at > $1 AND published_at <= now()
        ORDER BY published_at ASC LIMIT 1`,
      [post.published_at],
    ),
  ]);
  return { older, newer };
}

export async function countPublishedPosts(category?: string): Promise<number> {
  const row = category
    ? await queryOne<{ count: string }>(
        `SELECT CAST(COUNT(*) AS CHAR) AS count FROM posts
          WHERE status = 'published' AND published_at <= now() AND category = $1`,
        [category],
      )
    : await queryOne<{ count: string }>(
        `SELECT CAST(COUNT(*) AS CHAR) AS count FROM posts
          WHERE status = 'published' AND published_at <= now()`,
      );
  return Number(row?.count ?? 0);
}

export async function categoryCounts(): Promise<Record<string, number>> {
  const rows = await query<{ category: string; count: string }>(
    `SELECT category, CAST(COUNT(*) AS CHAR) AS count FROM posts
      WHERE status = 'published' AND published_at <= now()
      GROUP BY category`,
  );
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.count)]));
}

export async function allPublishedSlugs(): Promise<
  Array<{ slug: string; updated_at: string }>
> {
  return query<{ slug: string; updated_at: string }>(
    `SELECT slug, updated_at FROM posts
      WHERE status = 'published' AND published_at <= now()`,
  );
}

/* -------------------------------------------------------------------------- */
/* Posts — admin reads                                                         */
/* -------------------------------------------------------------------------- */

export async function listAllPosts(): Promise<PostSummary[]> {
  return query<PostSummary>(
    `SELECT ${SUMMARY_COLUMNS} FROM posts
      ORDER BY COALESCE(published_at, updated_at) DESC`,
  );
}

export async function getPostById(id: number): Promise<Post | null> {
  return queryOne<Post>(`SELECT * FROM posts WHERE id = $1`, [id]);
}

export async function takenSlugs(exceptId?: number): Promise<Set<string>> {
  const rows = exceptId
    ? await query<{ slug: string }>(
        `SELECT slug FROM posts WHERE id <> $1`,
        [exceptId],
      )
    : await query<{ slug: string }>(`SELECT slug FROM posts`);
  return new Set(rows.map((r) => r.slug));
}

/* -------------------------------------------------------------------------- */
/* Standing pages                                                              */
/* -------------------------------------------------------------------------- */

export type StandingPage = {
  slug: string;
  title: string;
  body_html: string;
  updated_at: string;
};

export async function getPage(slug: string): Promise<StandingPage | null> {
  return queryOne<StandingPage>(`SELECT * FROM pages WHERE slug = $1`, [slug]);
}

export async function listPages(): Promise<StandingPage[]> {
  return query<StandingPage>(`SELECT * FROM pages ORDER BY slug`);
}

/* -------------------------------------------------------------------------- */
/* Publications                                                                */
/* -------------------------------------------------------------------------- */

export type Publication = {
  id: number;
  title: string;
  subtitle: string;
  publisher: string;
  year: number | null;
  kind: string;
  description: string;
  url: string;
  isbn: string;
  sort_order: number;
};

export async function listPublications(): Promise<Publication[]> {
  return query<Publication>(
    `SELECT id, title, subtitle, publisher, year, kind, description, url, isbn, sort_order
       FROM publications
      ORDER BY sort_order ASC, year DESC, title ASC`,
  );
}

export async function getPublication(id: number): Promise<Publication | null> {
  return queryOne<Publication>(`SELECT * FROM publications WHERE id = $1`, [id]);
}

/* -------------------------------------------------------------------------- */
/* Press                                                                       */
/* -------------------------------------------------------------------------- */

export type PressItem = {
  id: number;
  outlet: string;
  title: string;
  url: string;
  /* Read as a plain 'YYYY-MM-DD' string, never a Date. The column is a DATE
     with no time and therefore no zone; turning it into a Date here would
     invent midnight in whichever zone the server happens to run in. */
  published_at: string | null;
  kind: string;
  quote: string;
  archive_url: string;
  language: string;
  sort_order: number;
};

const PRESS_COLUMNS = `
  id, outlet, title, url, DATE_FORMAT(published_at, '%Y-%m-%d') AS published_at,
  kind, quote, archive_url, language, sort_order
`;

/** Newest first — press reads as a reverse chronology, not a ranked list. */
export async function listPress(): Promise<PressItem[]> {
  return query<PressItem>(
    `SELECT ${PRESS_COLUMNS} FROM press
      ORDER BY sort_order ASC, published_at DESC, id DESC`,
  );
}

export async function getPressItem(id: number): Promise<PressItem | null> {
  return queryOne<PressItem>(
    `SELECT ${PRESS_COLUMNS} FROM press WHERE id = $1`,
    [id],
  );
}
