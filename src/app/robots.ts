import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/newsletter/bestaetigen", "/newsletter/abmelden"],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
