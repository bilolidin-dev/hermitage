import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsPage } from "@/components/public/pages/projects-page";
import { isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).meta.projects;
  return pageMetadata(locale, "projects", { title: t.title, description: t.description });
}

export default function Page() {
  return (
    <Suspense>
      <ProjectsPage />
    </Suspense>
  );
}
