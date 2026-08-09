import type { MetadataRoute } from "next";
import { allPublishedSlugs } from "@/lib/content";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const posts = await allPublishedSlugs();

  const staticRoutes = [
    "",
    "/texte",
    "/publikationen",
    "/ueber",
    "/newsletter",
    "/kontakt",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: `${base}/texte/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "yearly" as const,
      priority: 0.9,
    })),
  ];
}
