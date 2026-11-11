"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/shared/modal";
import { SmartImage } from "@/components/shared/smart-image";
import { localized, type Project } from "@/lib/domain/types";
import { fmt, formatNumber, localePath } from "@/lib/i18n";
import { cn, paragraphs } from "@/lib/utils";
import { useLocale } from "./locale-context";
import { ImageReveal } from "./reveal";
import { Container, DemoNote, LineLink } from "./ui";

const EASE = [0.76, 0, 0.24, 1] as const;
/** Reduced motion keeps the same markup (no hydration mismatch) but skips the animation. */
const INSTANT = { duration: 0 } as const;

/** Gallery rhythm: wide architectural frame, offset portrait pair, then balanced feature frame. */
const GALLERY_LAYOUT = [
  { cls: "lg:col-span-12", aspect: "aspect-[4/3] sm:aspect-[16/10]", sizes: "100vw" },
  { cls: "lg:col-span-5", aspect: "aspect-[4/5]", sizes: "(min-width: 1024px) 42vw, 100vw" },
  { cls: "lg:col-span-6 lg:col-start-7 lg:mt-32", aspect: "aspect-[4/5]", sizes: "(min-width: 1024px) 50vw, 100vw" },
  { cls: "lg:col-span-7 lg:col-start-3", aspect: "aspect-[4/5] sm:aspect-[5/6]", sizes: "(min-width: 1024px) 58vw, 100vw" },
] as const;

/**
 * Public project page body. Also rendered inside the admin preview with
 * unsaved form values (`preview`), where links are disabled.
 */
export function ProjectDetail({
  project,
  next,
  preview = false,
}: {
  project: Project;
  next?: Project | null;
  preview?: boolean;
}) {
  const { locale, t } = useLocale();
  const reduce = useReducedMotion();
  const [viewer, setViewer] = useState<number | null>(null);

  const missing = t.project.missingTranslation;
  const title = localized(project.title, locale) || missing;
  const location = localized(project.location, locale);
  const text = paragraphs(localized(project.description, locale));
  const [lead, ...body] = text;
  const images = project.gallery;

  const meta: Array<{ label: string; value: string }> = [
    { label: t.project.category, value: t.categories[project.category] },
    { label: t.project.location, value: location || "—" },
    { label: t.project.year, value: String(project.year) },
    ...(project.area ? [{ label: t.project.area, value: `${formatNumber(locale, project.area)} ${t.common.squareMeters}` }] : []),
  ];

  return (
    <article>
      {/* Cover */}
      <header className="relative isolate flex min-h-[88svh] items-end overflow-hidden bg-espresso text-ivory lg:min-h-[100svh]">
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ scale: 1.08, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduce ? INSTANT : { duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <SmartImage src={project.cover} alt={title} priority tone="dark" sizes="100vw" missingLabel={t.media.unavailable} />
        </motion.div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(33_29_28/0.74)_0%,rgb(33_29_28/0.22)_22%,rgb(33_29_28/0)_44%,rgb(33_29_28/0.84)_100%)]"
        />
        <Container className="pb-12 pt-32 lg:pb-16">
          {project.isDemo && (
            <p className="mb-6 inline-block border border-ivory/40 px-2.5 py-1 text-[0.66rem] font-semibold tracking-[0.1em]">
              {t.common.demoProject}
            </p>
          )}
          <h1 className="max-w-[14ch] font-display text-[clamp(3rem,8.4vw,9rem)] leading-[0.9] tracking-[-0.02em]">
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className="block"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                transition={reduce ? INSTANT : { duration: 1.1, ease: EASE, delay: 0.25 }}
              >
                {title}
              </motion.span>
            </span>
          </h1>
        </Container>
      </header>

      {/* Facts */}
      <Container>
        <dl className="grid grid-cols-2 border-b border-espresso/12 lg:grid-cols-4">
          {meta.map((m, i) => (
            <div
              key={m.label}
              className={cn(
                "border-espresso/12 py-6 pr-4 lg:py-8",
                i % 2 === 1 && "border-l pl-4 lg:pl-6",
                i >= 2 && "border-t lg:border-t-0",
                i === 2 && "lg:border-l lg:pl-6",
              )}
            >
              <dt className="text-xs text-muted">{m.label}</dt>
              <dd className="mt-2 font-display text-[1.6rem] leading-tight lg:text-3xl">{m.value}</dd>
            </div>
          ))}
        </dl>
      </Container>

      {/* Description */}
      <Container className="grid items-start gap-10 py-20 lg:grid-cols-12 lg:py-32">
        {lead ? (
          <p
            className={cn(
              "font-display text-[clamp(1.75rem,2.8vw,2.65rem)] leading-[1.15] text-balance-pretty",
              body.length > 0 ? "lg:col-span-6 lg:col-start-2" : "lg:col-span-8 lg:col-start-2",
            )}
          >
            {lead}
          </p>
        ) : (
          <p className="text-muted lg:col-span-8 lg:col-start-2">{missing}</p>
        )}
        {body.length > 0 && (
          <div className="space-y-5 border-t border-espresso/12 pt-6 text-[1rem] leading-[1.75] text-espresso/75 lg:col-span-4 lg:col-start-9 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-2">
            {body.map((p, i) => (
              <p key={i} className="max-w-[60ch]">
                {p}
              </p>
            ))}
          </div>
        )}
      </Container>

      {/* Gallery */}
      {images.length > 0 && (
        <section aria-label={t.project.gallery}>
          <Container className="grid gap-6 pb-24 lg:grid-cols-12 lg:gap-y-10 lg:pb-36">
            {images.map((ref, i) => {
              const layout = GALLERY_LAYOUT[i % GALLERY_LAYOUT.length]!;
              return (
                <button
                  key={`${ref}-${i}`}
                  type="button"
                  onClick={() => setViewer(i)}
                  aria-label={fmt(t.project.openImage, { n: i + 1 })}
                  className={cn("group block w-full cursor-zoom-in text-left", layout.cls)}
                >
                  <ImageReveal className={cn("relative overflow-hidden", layout.aspect)}>
                    <div className="absolute inset-0 transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.025]">
                      <SmartImage src={ref} alt={`${title} — ${i + 1}`} sizes={layout.sizes} missingLabel={t.media.unavailable} />
                    </div>
                  </ImageReveal>
                </button>
              );
            })}
          </Container>
        </section>
      )}

      {project.isDemo && (
        <Container className="pb-16">
          <DemoNote>{t.project.demoNote}</DemoNote>
        </Container>
      )}

      {/* Next project */}
      {next && next.id !== project.id && (
        <section className="bg-espresso text-ivory">
          <Link
            href={localePath(locale, `projects/${next.slug}`)}
            tabIndex={preview ? -1 : undefined}
            aria-disabled={preview || undefined}
            onClick={(e) => preview && e.preventDefault()}
            className="group block"
          >
            <Container className="grid items-end gap-8 py-16 lg:grid-cols-12 lg:py-24">
              <div className="lg:col-span-7">
                <p className="text-xs text-ivory/60">
                  {t.project.next}
                  {next.isDemo && <span className="ml-3 text-champagne">{t.common.demoProject}</span>}
                </p>
                <p className="mt-4 font-display text-[clamp(2.4rem,6vw,5.75rem)] leading-[0.95] transition-colors group-hover:text-champagne">
                  {localized(next.title, locale)}
                </p>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden lg:col-span-4 lg:col-start-9">
                <div className="absolute inset-0 transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-105">
                  <SmartImage src={next.cover} alt="" tone="dark" sizes="(min-width: 1024px) 33vw, 100vw" />
                </div>
              </div>
            </Container>
          </Link>
        </section>
      )}

      {!preview && (
        <Container className="py-12">
          <LineLink href={localePath(locale, "projects")}>{t.common.backToProjects}</LineLink>
        </Container>
      )}

      <Lightbox images={images} title={title} index={viewer} onChange={setViewer} />
    </article>
  );
}

function Lightbox({
  images,
  title,
  index,
  onChange,
}: {
  images: string[];
  title: string;
  index: number | null;
  onChange: (i: number | null) => void;
}) {
  const { t } = useLocale();
  const total = images.length;
  const startX = useRef<number | null>(null);
  const go = useCallback(
    (delta: number) => index !== null && onChange((index + delta + total) % total),
    [index, onChange, total],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const current = index !== null ? images[index] : undefined;

  return (
    <Modal open={index !== null} onClose={() => onChange(null)} variant="fullscreen" label={title}>
      <div
        className="flex h-full flex-col bg-espresso text-ivory"
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <p className="text-xs tabular-nums text-ivory/60" aria-live="polite">
            {index !== null && fmt(t.project.imageOf, { n: index + 1, total })}
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="grid size-11 place-items-center border border-ivory/20 hover:border-ivory"
            aria-label={t.project.closeViewer}
            autoFocus
          >
            <X className="size-5" strokeWidth={1.25} />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 px-4 pb-4 sm:px-20">
          <div className="relative h-full w-full">
            {current && (
              <SmartImage key={current} src={current} alt={`${title} — ${(index ?? 0) + 1}`} fit="contain" tone="dark" className="bg-transparent" sizes="100vw" />
            )}
          </div>
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t.project.prevImage}
                className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-espresso/60 hover:bg-espresso sm:left-5"
              >
                <ChevronLeft className="size-5" strokeWidth={1.25} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t.project.nextImage}
                className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-espresso/60 hover:bg-espresso sm:right-5"
              >
                <ChevronRight className="size-5" strokeWidth={1.25} />
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
