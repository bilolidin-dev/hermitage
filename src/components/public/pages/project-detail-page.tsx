"use client";

import { usePublishedProjects } from "@/hooks/use-data";
import { localized } from "@/lib/domain/types";
import { localePath } from "@/lib/i18n";
import { useLocale } from "../locale-context";
import { ProjectDetail } from "../project-detail";
import { Container, DocumentMeta, LineLink } from "../ui";

/**
 * Only published projects resolve here. Drafts and unpublished projects show
 * the "not found" state, exactly as they would for a visitor.
 */
export function ProjectDetailPage({ slug }: { slug: string }) {
  const { locale, t } = useLocale();
  const { data: projects, error } = usePublishedProjects();

  if (error) {
    return (
      <Container className="pb-32 pt-40">
        <p className="text-espresso/70">{t.common.loadError}</p>
      </Container>
    );
  }

  if (!projects) {
    return <div className="min-h-[100svh] bg-espresso" aria-busy aria-label={t.common.loading} />;
  }

  const index = projects.findIndex((p) => p.slug === slug);
  const project = projects[index];

  if (!project) {
    return (
      <Container className="pb-32 pt-40 lg:pt-52">
        <h1 className="font-display text-[clamp(3rem,8vw,7rem)] leading-none">{t.project.notFoundTitle}</h1>
        <p className="mt-6 max-w-md text-espresso/70">{t.project.notFoundText}</p>
        <div className="mt-10">
          <LineLink href={localePath(locale, "projects")}>{t.common.backToProjects}</LineLink>
        </div>
      </Container>
    );
  }

  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : null;
  const description = localized(project.description, locale).split("\n")[0]?.slice(0, 160);

  return (
    <>
      <DocumentMeta title={`${localized(project.title, locale)} — Hermitage`} description={description} />
      <ProjectDetail project={project} next={next} />
    </>
  );
}
