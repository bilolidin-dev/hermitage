"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SmartImage } from "@/components/shared/smart-image";
import { usePublishedProjects } from "@/hooks/use-data";
import { CATEGORY_IDS, localized, type CategoryId, type Project } from "@/lib/domain/types";
import { localePath, plural, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useLocale } from "../locale-context";
import { ProjectCard } from "../project-card";
import { Container, PageIntro } from "../ui";

const GRID_LAYOUT = [
  { cls: "lg:col-span-7", aspect: "aspect-[4/3]", sizes: "(min-width: 1024px) 58vw, (min-width: 640px) 50vw, 100vw" },
  { cls: "lg:col-span-5 lg:mt-28", aspect: "aspect-[4/5]", sizes: "(min-width: 1024px) 42vw, (min-width: 640px) 50vw, 100vw" },
  { cls: "lg:col-span-5", aspect: "aspect-[4/5]", sizes: "(min-width: 1024px) 42vw, (min-width: 640px) 50vw, 100vw" },
  { cls: "lg:col-span-7 lg:mt-28", aspect: "aspect-[4/3]", sizes: "(min-width: 1024px) 58vw, (min-width: 640px) 50vw, 100vw" },
  { cls: "sm:col-span-2 lg:col-span-8 lg:col-start-3", aspect: "aspect-[16/9]", sizes: "(min-width: 1024px) 66vw, 100vw" },
] as const;

function matches(project: Project, term: string) {
  if (!term) return true;
  const hay = [project.slug, ...(["ru", "ky", "uz"] as Locale[]).flatMap((l) => [project.title[l], project.location[l]])]
    .join(" ")
    .toLowerCase();
  return hay.includes(term.toLowerCase());
}

export function ProjectsPage() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: projects, error } = usePublishedProjects();

  const categoryParam = params.get("category");
  const category = (CATEGORY_IDS as readonly string[]).includes(categoryParam ?? "") ? (categoryParam as CategoryId) : null;
  const view = params.get("view") === "list" ? "list" : "grid";
  const [term, setTerm] = useState(params.get("q") ?? "");

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const counts = useMemo(() => {
    const map = new Map<CategoryId, number>();
    for (const p of projects ?? []) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [projects]);

  const visible = (projects ?? []).filter((p) => (!category || p.category === category) && matches(p, term.trim()));

  return (
    <>
      <PageIntro
        title={t.projects.title}
        lead={t.projects.lead}
        aside={
          projects && <p className="text-sm tabular-nums text-muted">{plural(locale, projects.length, t.projects.count)}</p>
        }
      />

      <Container className="sticky top-[var(--header-offset,0px)] z-30 -mt-px bg-ivory/95 backdrop-blur-sm transition-[top] duration-500 ease-[var(--ease-out-expo)]">
        <div className="flex flex-col gap-4 border-b border-espresso/12 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="group"
            aria-label={t.projects.filters}
            className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {[null, ...CATEGORY_IDS].map((id) => {
              const active = category === id;
              const count = id ? (counts.get(id) ?? 0) : (projects?.length ?? 0);
              return (
                <button
                  key={id ?? "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ category: id })}
                  className={cn(
                    "shrink-0 whitespace-nowrap border px-4 py-2.5 text-[0.8rem] font-medium transition-colors",
                    active
                      ? "border-espresso bg-espresso text-ivory"
                      : "border-transparent text-espresso/70 hover:border-espresso/25 hover:text-espresso",
                  )}
                >
                  {id ? t.categories[id] : t.projects.all}
                  <sup className="ml-1 text-[0.62rem] tabular-nums opacity-60">{count}</sup>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <label className="relative flex min-w-0 flex-1 items-center lg:w-72 lg:flex-none">
              <span className="sr-only">{t.projects.search}</span>
              <Search className="pointer-events-none absolute left-0 size-4 text-muted" strokeWidth={1.5} />
              <input
                type="search"
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  update({ q: e.target.value.trim() || null });
                }}
                placeholder={t.projects.searchPlaceholder}
                className="w-full border-b border-espresso/20 bg-transparent py-2.5 pl-7 pr-8 text-sm outline-none placeholder:text-muted focus:border-espresso [&::-webkit-search-cancel-button]:hidden"
              />
              {term && (
                <button
                  type="button"
                  onClick={() => {
                    setTerm("");
                    update({ q: null });
                  }}
                  aria-label={t.projects.clearSearch}
                  className="absolute right-0 p-1 text-muted hover:text-espresso"
                >
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              )}
            </label>
            <div role="group" aria-label={t.projects.view} className="flex shrink-0 text-[0.78rem] font-medium">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => update({ view: v === "grid" ? null : v })}
                  className={cn(
                    "px-3 py-2 transition-colors",
                    view === v ? "text-espresso underline decoration-champagne underline-offset-[6px]" : "text-muted hover:text-espresso",
                  )}
                >
                  {v === "grid" ? t.projects.viewGrid : t.projects.viewList}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Container>

      <Container className="pb-28 pt-14 lg:pb-40 lg:pt-20">
        {error ? (
          <p className="text-espresso/70">{t.common.loadError}</p>
        ) : !projects ? (
          <div className="grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-12" aria-busy>
            {GRID_LAYOUT.slice(0, 2).map((l, i) => (
              <div key={i} className={cn(l.cls, l.aspect, "skeleton")} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState title={t.projects.noneTitle} text={t.projects.noneText} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={t.projects.emptyTitle}
            text={t.projects.emptyText}
            action={
              <button
                type="button"
                onClick={() => {
                  setTerm("");
                  update({ q: null, category: null });
                }}
                className="mt-8 border border-espresso/30 px-6 py-3 text-sm font-semibold hover:border-espresso"
              >
                {t.projects.emptyReset}
              </button>
            }
          />
        ) : view === "grid" ? (
          <div className="grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-y-24">
            {visible.map((p, i) => {
              const layout = GRID_LAYOUT[i % GRID_LAYOUT.length]!;
              return (
                <ProjectCard
                  key={p.id}
                  project={p}
                  aspect={layout.aspect}
                  sizes={layout.sizes}
                  className={layout.cls}
                  priority={i < 2}
                  headingLevel="h2"
                />
              );
            })}
          </div>
        ) : (
          <ProjectList projects={visible} />
        )}
      </Container>
    </>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 text-center">
      <p className="font-display text-4xl">{title}</p>
      <p className="mx-auto mt-4 max-w-md text-espresso/65">{text}</p>
      {action}
    </div>
  );
}

/** Index view. On pointer devices a preview image follows the cursor. */
function ProjectList({ projects }: { projects: Project[] }) {
  const { locale, t } = useLocale();
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<Project | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 30, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 30, mass: 0.6 });

  return (
    <div
      className="relative"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        x.set(e.clientX);
        y.set(e.clientY);
      }}
      onPointerLeave={() => setHovered(null)}
    >
      <ul className="border-b border-espresso/12">
        {projects.map((p) => {
          const title = localized(p.title, locale);
          return (
            <li key={p.id} className="border-t border-espresso/12">
              <Link
                href={localePath(locale, `projects/${p.slug}`)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(p)}
                onFocus={() => setHovered(null)}
                className="group grid grid-cols-[4.5rem_1fr] items-center gap-x-4 gap-y-1 py-5 sm:grid-cols-[6rem_1fr] lg:grid-cols-12 lg:gap-6 lg:py-7"
              >
                <span className="relative row-span-2 aspect-square overflow-hidden lg:hidden">
                  <SmartImage src={p.cover} alt="" sizes="96px" />
                </span>
                <h2 className="font-display text-[1.65rem] leading-tight transition-transform duration-500 ease-[var(--ease-out-expo)] sm:text-3xl lg:col-span-6 lg:text-[2.6rem] lg:group-hover:translate-x-3">
                  {title}
                </h2>
                <p className="text-[0.8rem] text-muted lg:col-span-3">
                  {p.isDemo && (
                    <span className="mr-2 border border-espresso/25 px-1.5 py-px text-[0.62rem] font-semibold tracking-[0.06em] text-espresso">
                      {t.common.demoProject}
                    </span>
                  )}
                  {t.categories[p.category]}
                  <span className="lg:hidden">, {localized(p.location, locale)}, {p.year}</span>
                </p>
                <p className="hidden text-[0.8rem] text-muted lg:col-span-2 lg:block">{localized(p.location, locale)}</p>
                <p className="hidden text-right text-[0.8rem] tabular-nums text-muted lg:col-span-1 lg:block">{p.year}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      <AnimatePresence>
        {hovered && !reduce && (
          <motion.div
            key="preview"
            aria-hidden
            className="pointer-events-none fixed left-0 top-0 z-40 hidden aspect-[4/5] w-[18rem] overflow-hidden lg:block"
            style={{ x: sx, y: sy, translateX: "24px", translateY: "-50%" }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35 }}
          >
            <SmartImage key={hovered.id} src={hovered.cover} alt="" sizes="288px" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
