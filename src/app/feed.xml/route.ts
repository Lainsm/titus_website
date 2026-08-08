import { listPublishedPosts } from "@/lib/content";
import { env } from "@/lib/env";
import { site } from "@/lib/site";
import { excerptFrom, refine } from "@/lib/typography";

export const dynamic = "force-dynamic";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const posts = await listPublishedPosts({ limit: 50 });
  const base = env.siteUrl;

  const items = posts
    .map((post) => {
      const url = `${base}/texte/${post.slug}`;
      const description = post.lead || excerptFrom(post.subtitle, 240);
      return `    <item>
      <title>${escapeXml(refine(post.title))}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${new Date(post.published_at ?? post.created_at).toUTCString()}</pubDate>
      <description>${escapeXml(refine(description))}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${escapeXml(base)}</link>
    <description>${escapeXml(site.description)}</description>
    <language>de-ch</language>
    <atom:link href="${escapeXml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
