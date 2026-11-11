"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { useSettings } from "@/hooks/use-data";
import { LOCALES, LOCALE_META, localePath, switchLocalePath, type Locale } from "@/lib/i18n";
import { cn, formatPhone, instagramHandle, whatsappLink } from "@/lib/utils";
import { useLocale } from "./locale-context";

const NAV = ["projects", "services", "about", "process", "contacts"] as const;

export function useNavItems() {
  const { locale, t } = useLocale();
  return NAV.map((key) => ({ key, href: localePath(locale, key), label: t.nav[key] }));
}

/** Language switch. Keeps the current page and its filters (?category=…). */
export function LocaleSwitcher(props: { className?: string; tone: "light" | "dark" }) {
  return (
    <Suspense fallback={<LocaleLinks {...props} search="" />}>
      <LocaleSwitcherWithQuery {...props} />
    </Suspense>
  );
}

function LocaleSwitcherWithQuery(props: { className?: string; tone: "light" | "dark" }) {
  const params = useSearchParams();
  const qs = params.toString();
  return <LocaleLinks {...props} search={qs ? `?${qs}` : ""} />;
}

function LocaleLinks({ className, tone, search }: { className?: string; tone: "light" | "dark"; search: string }) {
  const { locale, t } = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t.nav.language} className={cn("flex items-center gap-1 text-[0.72rem] font-semibold", className)}>
      {LOCALES.map((l: Locale) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={`${switchLocalePath(pathname, l)}${search}`}
            hrefLang={l}
            lang={l}
            aria-current={active ? "true" : undefined}
            title={LOCALE_META[l].native}
            scroll={false}
            className={cn(
              "relative px-1.5 py-2 tracking-[0.14em] transition-opacity",
              active ? "opacity-100" : "opacity-55 hover:opacity-100",
            )}
          >
            {LOCALE_META[l].code}
            {active && (
              <span
                aria-hidden
                className={cn("absolute inset-x-1.5 bottom-1 h-px", tone === "light" ? "bg-ivory" : "bg-espresso")}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteHeader() {
  const { locale, t } = useLocale();
  const pathname = usePathname();
  const items = useNavItems();
  const { data: settings } = useSettings();
  const reduce = useReducedMotion();
  // Open only for the route it was opened on, so navigating closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) =>
    setOpenFor((prev) => ((typeof next === "function" ? next(prev === pathname) : next) ? pathname : null));
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const overlayRoute = pathname === `/${locale}` || /^\/[a-z]{2}\/projects\/[^/]+$/.test(pathname);
  const overlay = overlayRoute && !scrolledPastHero && !open;
  const tone: "light" | "dark" = overlay || open ? "light" : "dark";

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolledPastHero(y > window.innerHeight * 0.8 - 80);
      setHidden(y > 240 && y > lastY.current + 4);
      if (y < lastY.current - 4 || y <= 240) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Sticky elements below the header (e.g. the projects filter bar) read this offset.
  useEffect(() => {
    const height = hidden && !open ? 0 : (headerRef.current?.offsetHeight ?? 0);
    document.documentElement.style.setProperty("--header-offset", `${height}px`);
  }, [hidden, open]);

  // Mobile menu behaves like a modal: page behind is inert, focus moves in and back.
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    const background = [...document.querySelectorAll<HTMLElement>("main#content, footer")];
    background.forEach((el) => el.setAttribute("inert", ""));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenFor(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>("a")?.focus(), 50);
    return () => {
      window.clearTimeout(focusTimer);
      background.forEach((el) => el.removeAttribute("inert"));
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      toggle?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <a
        href="#content"
        className="sr-only z-[60] bg-espresso px-4 py-3 text-sm text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.nav.skipToContent}
      </a>
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,border-color] duration-500 ease-[var(--ease-out-expo)]",
          hidden && !open ? "-translate-y-full" : "translate-y-0",
          overlay || open
            ? "border-b border-transparent bg-transparent text-ivory"
            : "border-b border-espresso/10 bg-ivory/90 text-espresso backdrop-blur-md",
        )}
      >
        <div className="mx-auto flex h-18 max-w-[1680px] items-center justify-between gap-6 px-4 sm:px-6 lg:h-20 lg:px-10">
          <Link href={localePath(locale)} className="shrink-0" aria-label={settings?.studioName ?? "Hermitage"}>
            <Logo name={settings?.studioName} logo={settings?.logo} />
          </Link>

          <nav aria-label={t.nav.primary} className="hidden lg:block">
            <ul className="flex items-center gap-9 text-[0.84rem] font-medium">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="group relative py-2"
                    >
                      {item.label}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-champagne transition-transform duration-500 ease-[var(--ease-out-expo)]",
                          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <LocaleSwitcher tone={tone} className="hidden sm:flex" />
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="-mr-2 flex items-center gap-2 px-2 py-2 text-[0.8rem] font-medium lg:hidden"
            >
              <span>{open ? t.nav.closeMenu : t.nav.menu}</span>
              {open ? <X className="size-5" strokeWidth={1.25} /> : <Menu className="size-5" strokeWidth={1.25} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={menuRef}
            className="fixed inset-0 z-40 flex flex-col bg-espresso px-4 pb-8 pt-24 text-ivory sm:px-6 lg:hidden"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={reduce ? { duration: 0 } : { duration: 0.36, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label={t.nav.primary} className="flex-1 overflow-y-auto">
              <ul className="border-t border-ivory/15">
                {items.map((item, i) => (
                  <motion.li
                    key={item.key}
                    className="border-b border-ivory/15"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduce ? { duration: 0 } : { delay: 0.06 + i * 0.035, duration: 0.28 }}
                  >
                    <Link
                      href={item.href}
                      className="block py-4 font-display text-[2.6rem] leading-none sm:text-6xl"
                      aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="mt-8 grid gap-5 text-sm">
              <LocaleSwitcher tone="light" className="-ml-1.5" />
              {settings && (
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-ivory/80">
                  <a href={whatsappLink(settings.whatsapp)} target="_blank" rel="noreferrer">
                    WhatsApp {formatPhone(settings.whatsapp)}
                  </a>
                  <a href={settings.instagram} target="_blank" rel="noreferrer">
                    Instagram {instagramHandle(settings.instagram)}
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
