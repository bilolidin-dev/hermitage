import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/** /robots.txt — the public site is crawlable; the demo admin is not. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }],
    sitemap: new URL("/sitemap.xml", base).href,
    host: base.origin,
  };
}
