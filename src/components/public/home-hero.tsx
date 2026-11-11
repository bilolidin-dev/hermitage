"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { SmartImage } from "@/components/shared/smart-image";
import { usePublishedProjects, useSettings } from "@/hooks/use-data";
import { localized } from "@/lib/domain/types";
import { fmt, formatCoordinate, formatNumber, localePath } from "@/lib/i18n";
import { cn, whatsappLink } from "@/lib/utils";
import { introOffsetSeconds } from "./intro-client";
import { useLocale } from "./locale-context";
import { buttonClass, Container } from "./ui";

const EASE = [0.76, 0, 0.24, 1] as const;
/** Reduced motion keeps the same markup (no hydration mismatch) but skips the animation. */
const INSTANT = { duration: 0 } as const;
const SLIDE_MS = 6500;

/** A drafting line that draws itself once on load. */
function DraftLine({ className, axis, delay }: { className: string; axis: "x" | "y"; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className={cn("pointer-events-none absolute bg-ivory/16", axis === "x" ? "h-px origin-left" : "w-px origin-top", className)}
      initial={axis === "x" ? { scaleX: 0 } : { scaleY: 0 }}
      animate={axis === "x" ? { scaleX: 1 } : { scaleY: 1 }}
      transition={reduce ? INSTANT : { duration: 1.4, ease: EASE, delay }}
    />
  );
}

/**
 * Homepage hero. The page opens like an architectural drawing: construction
 * lines draw across the screen, then a featured project appears inside the
 * frame with its floor area dimensioned above it, and the city coordinates
 * sit along the base line.
 */
export function HomeHero() {
  const { locale, t } = useLocale();
  const reduce = useReducedMotion();
  // While the first-visit intro is on screen, start the hero choreography after it.
  const [offset] = useState(introOffsetSeconds);
  const { data: projects, loading } = usePublishedProjects();
  const { data: settings } = useSettings();
  const featured = (projects ?? []).filter((p) => p.featured && p.cover);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // hover / focus
  const [stopped, setStopped] = useState(false); // explicit pause button (WCAG 2.2.2)
  const count = featured.length;
  const current = count ? featured[index % count] : undefined;

  useEffect(() => {
    if (reduce || paused || stopped || count < 2) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % count);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused, stopped, count]);

  const go = (delta: number) => count && setIndex((i) => (i + delta + count) % count);
  const pad = (n: number) => String(n).padStart(2, "0");
  const title = current ? localized(current.title, locale) : "";
  const dimension = current
    ? current.area
      ? `${formatNumber(locale, current.area)} ${t.common.squareMeters}`
      : String(current.year)
    : "";

  return (
    <section className="relative isolate overflow-hidden bg-espresso text-ivory" aria-labelledby="hero-title">
      <Container className="relative grid min-h-[100svh] grid-rows-[1fr_auto] pt-24 lg:pt-28">
        <div className="relative grid gap-y-10 pb-10 lg:grid-cols-12 lg:gap-x-6 lg:pb-14">
          {/* Construction lines (desktop) */}
          <DraftLine axis="y" className="top-0 bottom-0 left-[calc(50%+0.75rem)] hidden lg:block" delay={0.1 + offset} />
          <DraftLine axis="x" className="-left-40 -right-40 top-[2.5rem] hidden lg:block" delay={0.25 + offset} />

          {/* Headline */}
          <div className="relative z-10 flex flex-col justify-end lg:col-span-6 lg:pr-6">
            <h1
              id="hero-title"
              className="font-display text-[clamp(3.1rem,7.2vw,8.75rem)] leading-[0.9] tracking-[-0.025em]"
            >
              {t.home.heroLines.map((line, i) => (
                <span key={i} className="block overflow-hidden pb-[0.08em]">
                  <motion.span
                    className={cn("block", i === 1 && "sm:pl-[12%]", i === 2 && "sm:pl-[4%]")}
                    initial={{ y: "105%" }}
                    animate={{ y: "0%" }}
                    transition={reduce ? INSTANT : { duration: 1.2, ease: EASE, delay: 0.55 + i * 0.12 + offset }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reduce ? INSTANT : { duration: 1, delay: 1.25 + offset }}
              className="mt-10 flex flex-col gap-8 lg:mt-14"
            >
              <p className="max-w-[44ch] text-[0.95rem] leading-relaxed text-ivory/70">{t.home.heroLead}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={localePath(locale, "projects")} className={buttonClass("solid", "light")}>
                  {t.home.heroCta}
                </Link>
                {settings && (
                  <a
                    href={whatsappLink(settings.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClass("outline", "light")}
                  >
                    {t.home.heroContact}
                  </a>
                )}
              </div>
            </motion.div>
          </div>

          {/* Framed featured project */}
          <div
            className="relative flex flex-col lg:col-span-6 lg:col-start-7"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            {/* Dimension line */}
            <motion.div
              aria-hidden={!current}
              className="relative mb-4 hidden h-6 items-center lg:flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reduce ? INSTANT : { delay: 1.5 + offset, duration: 0.8 }}
            >
              <span className="absolute inset-x-0 top-1/2 h-px bg-champagne/60" />
              <span className="absolute left-0 top-1/2 h-3 w-px -translate-y-1/2 bg-champagne" />
              <span className="absolute right-0 top-1/2 h-3 w-px -translate-y-1/2 bg-champagne" />
              <AnimatePresence mode="wait">
                {current && (
                  <motion.span
                    key={current.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={reduce ? INSTANT : { duration: 0.4 }}
                    className="relative mx-auto bg-espresso px-4 text-[0.72rem] font-medium tabular-nums tracking-[0.08em] text-champagne"
                  >
                    {dimension}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div
              className="relative aspect-[4/5] w-full overflow-hidden bg-charcoal sm:aspect-[16/11] lg:aspect-auto lg:min-h-[52vh] lg:flex-1"
              initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
              animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
              transition={reduce ? INSTANT : { duration: 1.3, ease: EASE, delay: 0.45 + offset }}
            >
              {loading && !projects ? (
                <div className="absolute inset-0 animate-pulse bg-charcoal" aria-hidden />
              ) : current ? (
                <AnimatePresence initial={false}>
                  <motion.div
                    key={current.id}
                    className="absolute inset-0"
                    initial={{ clipPath: "inset(0% 0% 0% 100%)" }}
                    animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                    exit={{ opacity: 1, zIndex: 0 }}
                    style={{ zIndex: 1 }}
                    transition={reduce ? INSTANT : { duration: 1.2, ease: EASE }}
                  >
                    <Link
                      href={localePath(locale, `projects/${current.slug}`)}
                      aria-label={fmt(t.home.heroOpen, { title })}
                      className="absolute inset-0 block"
                    >
                      <motion.div
                        className="absolute inset-0"
                        initial={{ scale: 1.08 }}
                        animate={{ scale: 1 }}
                        transition={reduce ? INSTANT : { duration: SLIDE_MS / 1000 + 1, ease: "linear" }}
                      >
                        <SmartImage
                          src={current.cover}
                          alt={title}
                          priority
                          tone="dark"
                          sizes="(min-width: 1024px) 50vw, 100vw"
                          missingLabel={t.media.unavailable}
                        />
                      </motion.div>
                    </Link>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-10 text-center text-sm text-ivory/55">
                  <p className="max-w-[32ch]">{t.home.heroEmpty}</p>
                </div>
              )}
            </motion.div>

            {/* Caption + controls */}
            <div className="mt-5 flex min-h-[3.75rem] flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <AnimatePresence mode="wait" initial={false}>
                {current && (
                  <motion.div
                    key={current.id}
                    className="min-w-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={reduce ? INSTANT : { duration: 0.35 }}
                    aria-live="polite"
                  >
                    <Link
                      href={localePath(locale, `projects/${current.slug}`)}
                      className="font-display-text text-2xl leading-tight hover:text-champagne sm:text-[1.7rem]"
                    >
                      {title}
                    </Link>
                    <p className="mt-1 text-[0.78rem] text-ivory/55">
                      {t.categories[current.category]}, {localized(current.location, locale)}, {current.year}
                      {current.isDemo && <span className="ml-3 text-champagne">{t.common.demoProject}</span>}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {count > 1 && (
                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-3 text-[0.75rem] tabular-nums text-ivory/60" aria-label={fmt(t.home.heroSlide, { n: (index % count) + 1, total: count })}>
                    {pad((index % count) + 1)} / {pad(count)}
                  </span>
                  {!reduce && (
                    <button
                      type="button"
                      onClick={() => setStopped((v) => !v)}
                      aria-label={stopped ? t.home.heroPlay : t.home.heroPause}
                      aria-pressed={stopped}
                      className="grid size-10 place-items-center border border-ivory/20 transition-colors hover:border-ivory"
                    >
                      {stopped ? <Play className="size-3.5" strokeWidth={1.5} /> : <Pause className="size-3.5" strokeWidth={1.5} />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={t.home.heroPrev}
                    className="grid size-10 place-items-center border border-ivory/20 transition-colors hover:border-ivory"
                  >
                    <ChevronLeft className="size-4" strokeWidth={1.25} />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={t.home.heroNext}
                    className="grid size-10 place-items-center border border-ivory/20 transition-colors hover:border-ivory"
                  >
                    <ChevronRight className="size-4" strokeWidth={1.25} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Base line: city coordinates */}
        <div className="relative">
          <DraftLine axis="x" className="-left-40 -right-40 top-0" delay={0.4 + offset} />
          <ul className="flex flex-wrap gap-x-12 gap-y-3 py-6 text-[0.72rem] text-ivory/55">
            {settings?.cities.map((city) => (
              <li key={city.id} className="flex items-baseline gap-3">
                <span className="font-display text-lg text-ivory">{localized(city.name, locale)}</span>
                <span className="tabular-nums">
                  {formatCoordinate(city.latitude, "lat")}, {formatCoordinate(city.longitude, "lon")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
