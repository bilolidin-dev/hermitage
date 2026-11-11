"use client";

import { usePublishedProjects, useSettings, useVisibleServices } from "@/hooks/use-data";
import { localized } from "@/lib/domain/types";
import { localePath } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ContactBand } from "../contact-band";
import { HomeHero } from "../home-hero";
import { useLocale } from "../locale-context";
import { ProjectCard } from "../project-card";
import { Container, DocumentMeta, LineLink } from "../ui";

/** Asymmetric placement for the featured selection, repeating every three projects. */
const FEATURED_LAYOUT = [
  { cls: "lg:col-span-7", aspect: "aspect-[4/3]", sizes: "(min-width: 1024px) 58vw, 100vw" },
  { cls: "lg:col-span-4 lg:col-start-9 lg:mt-48", aspect: "aspect-[4/5]", sizes: "(min-width: 1024px) 33vw, 100vw" },
  { cls: "lg:col-span-6 lg:col-start-3", aspect: "aspect-[16/10]", sizes: "(min-width: 1024px) 50vw, 100vw" },
] as const;

export function HomePage() {
  const { locale, t } = useLocale();
  const { data: projects } = usePublishedProjects();
  const { data: services } = useVisibleServices();
  const { data: settings } = useSettings();
  const featured = (projects ?? []).filter((p) => p.featured);

  return (
    <>
      <DocumentMeta title={settings?.seo.title[locale]} description={settings?.seo.description[locale]} />
      <HomeHero />

      {/* Statement */}
      <section className="py-28 lg:py-44">
        <Container className="grid gap-10 lg:grid-cols-12">
          <p className="font-display text-[clamp(2rem,4.4vw,4.4rem)] leading-[1.06] text-balance-pretty lg:col-span-9 lg:col-start-3">
            {t.home.introStatement}
          </p>
          <p className="max-w-[52ch] border-l border-espresso/15 pl-6 text-[0.98rem] leading-relaxed text-espresso/70 lg:col-span-5 lg:col-start-7">
            {t.home.introText}
          </p>
        </Container>
      </section>

      {/* Featured projects */}
      <section aria-labelledby="featured-title" className="pb-28 lg:pb-44">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-espresso/12 pt-8">
            <h2 id="featured-title" className="font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-none">
              {t.home.featuredTitle}
            </h2>
            <LineLink href={localePath(locale, "projects")}>
              {t.common.allProjects}
              {projects ? ` (${projects.length})` : ""}
            </LineLink>
          </div>
          {projects && featured.length === 0 && <p className="mt-12 text-muted">{t.home.featuredEmpty}</p>}
          <div className="mt-14 grid gap-x-6 gap-y-20 lg:mt-20 lg:grid-cols-12 lg:gap-y-28">
            {!projects &&
              [0, 1].map((i) => (
                <div key={i} className={cn(FEATURED_LAYOUT[i]?.cls, FEATURED_LAYOUT[i]?.aspect, "skeleton")} />
              ))}
            {featured.map((project, i) => {
              const layout = FEATURED_LAYOUT[i % FEATURED_LAYOUT.length]!;
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  aspect={layout.aspect}
                  sizes={layout.sizes}
                  className={layout.cls}
                />
              );
            })}
          </div>
        </Container>
      </section>

      {/* Services */}
      <section aria-labelledby="services-title" className="bg-stone py-24 lg:py-36">
        <Container>
          <div className="grid gap-8 lg:grid-cols-12">
            <h2 id="services-title" className="font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-none lg:col-span-6">
              {t.home.servicesTitle}
            </h2>
            <div className="flex items-end lg:col-span-4 lg:col-start-9 lg:justify-end">
              <LineLink href={localePath(locale, "services")}>{t.home.servicesLink}</LineLink>
            </div>
          </div>
          <ul className="mt-14 border-b border-espresso/15 lg:mt-20">
            {services?.map((service) => (
              <li
                key={service.id}
                className="group grid gap-3 border-t border-espresso/15 py-8 transition-colors duration-500 lg:grid-cols-12 lg:gap-6 lg:py-10"
              >
                <h3 className="font-display text-[1.9rem] leading-tight transition-transform duration-700 ease-[var(--ease-out-expo)] lg:col-span-5 lg:text-[2.4rem] lg:group-hover:translate-x-3">
                  {localized(service.title, locale)}
                </h3>
                <p className="max-w-[56ch] text-[0.95rem] leading-relaxed text-espresso/70 lg:col-span-5 lg:col-start-7 lg:pt-2">
                  {localized(service.description, locale)}
                </p>
              </li>
            ))}
            {!services && <li className="h-40 border-t border-espresso/15" aria-hidden />}
          </ul>
        </Container>
      </section>

      {/* Process */}
      <section aria-labelledby="process-title" className="bg-espresso py-24 text-ivory lg:py-36">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="process-title" className="font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-none">
              {t.home.processTitle}
            </h2>
            <LineLink href={localePath(locale, "process")}>{t.home.processLink}</LineLink>
          </div>
          <ol className="mt-14 grid gap-px bg-ivory/12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
            {t.process.steps.map((step, i) => (
              <li key={step.title} className="bg-espresso p-6 pb-10 sm:p-8 lg:min-h-[17rem] lg:p-10">
                <span className="font-display text-5xl tabular-nums text-champagne" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-ivory/60">{step.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <ContactBand />
    </>
  );
}
