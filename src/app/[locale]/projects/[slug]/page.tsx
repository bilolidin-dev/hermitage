import type { Metadata } from "next";
import { ProjectDetailPage } from "@/components/public/pages/project-detail-page";
import { isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { seedProjects } from "@/lib/seed/projects";
import { pageMetadata } from "@/lib/seo";
import { paragraphs } from "@/lib/utils";

const publishedSeed = () => seedProjects().filter((p) => p.status === "published");

/*
 * Rendered on demand (not pre-rendered): projects created in the admin exist
 * only in the browser, so every slug must reach the page. The parent layout's
 * `dynamicParams = false` (unknown locales → 404) would otherwise apply to
 * slugs as well. Metadata is still server-rendered for built-in projects.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const decoded = decodeURIComponent(slug);
  const project = publishedSeed().find((p) => p.slug === decoded);
  if (!project) {
    // Admin-created projects live in the visitor's browser, so the server only knows the section.
    const t = getDictionary(locale).meta.projects;
    return pageMetadata(locale, `projects/${decoded}`, { title: t.title, description: t.description });
  }
  const first = paragraphs(project.description[locale])[0] ?? "";
  const description = first.length > 160 ? `${first.slice(0, 157).trimEnd()}…` : first;
  return pageMetadata(locale, `projects/${project.slug}`, {
    title: project.title[locale],
    description,
    type: "article",
  });
}

/** Content is read from the browser data layer on the client (see README, "Client-side content"). */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProjectDetailPage slug={decodeURIComponent(slug)} />;
}
