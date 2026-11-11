"use client";

import Link from "next/link";
import { SmartImage } from "@/components/shared/smart-image";
import { localized, type Project } from "@/lib/domain/types";
import { localePath } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useLocale } from "./locale-context";
import { ImageReveal } from "./reveal";

/** Editorial project tile: image first, a quiet caption underneath. */
export function ProjectCard({
  project,
  aspect = "aspect-[4/3]",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className,
  priority,
  headingLevel = "h3",
}: {
  project: Project;
  aspect?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const { locale, t } = useLocale();
  const title = localized(project.title, locale);
  const Heading = headingLevel;
  return (
    <article className={cn("group", className)}>
      <Link href={localePath(locale, `projects/${project.slug}`)} className="block">
        <ImageReveal className={cn("relative overflow-hidden", aspect)}>
          <div className="absolute inset-0 transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.035]">
            <SmartImage src={project.cover} alt={title} sizes={sizes} priority={priority} missingLabel={t.media.unavailable} />
          </div>
          {project.isDemo && (
            <span className="absolute left-3 top-3 bg-ivory/90 px-2 py-1 text-[0.62rem] font-semibold tracking-[0.08em] text-espresso">
              {t.common.demoProject}
            </span>
          )}
        </ImageReveal>
        <div className="mt-5 flex items-start justify-between gap-6">
          <div>
            <Heading className="font-display-text text-[1.75rem] leading-[1.05] sm:text-[2rem]">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-700 ease-[var(--ease-out-expo)] group-hover:bg-[length:100%_1px]">
                {title}
              </span>
            </Heading>
            <p className="mt-2 text-[0.8rem] text-muted">{t.categories[project.category]}</p>
          </div>
          <p className="shrink-0 pt-2 text-right text-[0.8rem] tabular-nums text-muted">
            {localized(project.location, locale)}
            <br />
            {project.year}
          </p>
        </div>
      </Link>
    </article>
  );
}
