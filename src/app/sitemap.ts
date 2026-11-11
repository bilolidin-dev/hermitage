import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
import { seedProjects } from "@/lib/seed/projects";
import { PUBLIC_PATHS, siteUrl } from "@/lib/seo";

/**
 * /sitemap.xml — every public page in every language, with hreflang
 * alternates. Projects come from the built-in data; projects created in the
 * demo admin exist only in one browser and cannot be listed here (with a
 * backend, read published projects from the database instead).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const abs = (path: string) => new URL(path, base).href;
  const entry = (path: string, extra: Partial<MetadataRoute.Sitemap[number]> = {}) =>
    LOCALES.map((locale) => ({
      url: abs(path ? `/${locale}/${path}` : `/${locale}`),
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, abs(path ? `/${l}/${path}` : `/${l}`)])),
      },
      ...extra,
    }));

  const pages = PUBLIC_PATHS.flatMap((path) =>
    entry(path, { changeFrequency: path === "" || path === "projects" ? "weekly" : "monthly", priority: path === "" ? 1 : 0.7 }),
  );
  const projects = seedProjects()
    .filter((p) => p.status === "published")
    .flatMap((p) => entry(`projects/${p.slug}`, { lastModified: p.updatedAt, changeFrequency: "monthly", priority: 0.6 }));

  return [...pages, ...projects];
}
