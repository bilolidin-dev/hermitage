"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ExternalLink,
  FolderOpen,
  Images,
  LayoutGrid,
  ListChecks,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/shared/logo";
import { usePreferences, useQuery } from "@/hooks/use-data";
import { localized } from "@/lib/domain/types";
import { LOCALES, LOCALE_META } from "@/lib/i18n";
import { getRepositories, resetDemoData } from "@/lib/repositories";
import { cn } from "@/lib/utils";
import { AdminProviders, GuardedLink, useAdminI18n, useConfirm, useGuardedRouter, useToast } from "./admin-context";
import { buttonStyles } from "./ui";

const NAV = [
  { key: "dashboard", href: "/admin", icon: LayoutGrid },
  { key: "projects", href: "/admin/projects", icon: FolderOpen },
  { key: "services", href: "/admin/services", icon: ListChecks },
  { key: "media", href: "/admin/media", icon: Images },
  { key: "settings", href: "/admin/settings", icon: Settings2 },
] as const;

export function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <AdminProviders>
      <Shell>{children}</Shell>
    </AdminProviders>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { locale, t } = useAdminI18n();
  const pathname = usePathname();
  // The drawer is open only for the route it was opened on, so navigating closes it.
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const menuOpen = menuOpenFor === pathname;
  const setMenuOpen = (open: boolean) => setMenuOpenFor(open ? pathname : null);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `${t.meta.admin.title} — Hermitage`;
  }, [locale, t, pathname]);

  return (
    <div className="min-h-dvh bg-[#efebe5] text-espresso">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-espresso/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[min(18rem,86vw)] lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              aria-label={t.admin.shell.title}
            >
              <Sidebar onClose={() => setMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-espresso/10 bg-[#efebe5]/92 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="-ml-2 grid size-10 place-items-center lg:hidden"
              aria-label={t.admin.shell.openMenu}
              aria-expanded={menuOpen}
            >
              <Menu className="size-5" strokeWidth={1.5} />
            </button>
            <span className="mr-auto border border-champagne/60 px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.14em] text-bronze lg:hidden">
              DEMO
            </span>
            <GlobalSearch />
            {!pathname.startsWith("/admin/projects") && (
              <>
            <span className="hidden shrink-0 sm:block">
            <GuardedLink href="/admin/projects/new" className={buttonStyles("primary")}>
              <Plus className="size-4" strokeWidth={2} />
              {t.admin.shell.newProject}
            </GuardedLink>
            </span>
            <GuardedLink
              href="/admin/projects/new"
              className="grid size-11 shrink-0 place-items-center bg-espresso text-ivory sm:hidden"
              aria-label={t.admin.shell.newProject}
            >
              <Plus className="size-4" strokeWidth={2} />
            </GuardedLink>
              </>
            )}
          </div>
        </header>

        <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-8">
          <DemoNotice />
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { locale, t, setLocale, error } = useAdminI18n();
  const pathname = usePathname();
  const confirm = useConfirm();
  const toast = useToast();
  const rawRouter = useRouter();
  const { data: settings } = useQuery((r) => r.settings.get(), ["settings"]);
  const siteHref = `/${settings?.defaultLocale ?? "ru"}`;

  const reset = async () => {
    const ok = await confirm({
      title: t.admin.shell.resetTitle,
      text: t.admin.shell.resetText,
      confirmLabel: t.admin.shell.resetConfirm,
      tone: "danger",
    });
    if (!ok) return;
    try {
      await resetDemoData();
      toast({ message: t.admin.shell.resetDone });
      rawRouter.push("/admin");
    } catch (e) {
      toast({ message: error(e), tone: "error" });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-espresso text-ivory">
      <div className="flex items-start justify-between gap-3 px-6 pb-8 pt-7">
        <GuardedLink href="/admin" className="block">
          <Logo name={settings?.studioName} logo={settings?.logo} />
          <span className="mt-3 block text-[0.72rem] text-muted-inverse">{t.admin.shell.title}</span>
        </GuardedLink>
        {onClose && (
          <button type="button" onClick={onClose} aria-label={t.admin.shell.closeMenu} className="-mr-2 p-2">
            <X className="size-5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <nav aria-label={t.admin.shell.title} className="px-3">
        <ul className="space-y-0.5">
          {NAV.map(({ key, href, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <li key={key}>
                <GuardedLink
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 text-[0.86rem] transition-colors",
                    active ? "bg-ivory/8 text-ivory" : "text-ivory/65 hover:bg-ivory/5 hover:text-ivory",
                  )}
                >
                  {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 bg-champagne" />}
                  <Icon className="size-[1.05rem]" strokeWidth={1.5} />
                  {t.admin.shell.nav[key]}
                </GuardedLink>
              </li>
            );
          })}
        </ul>
        <a
          href={siteHref}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center gap-3 px-3 py-2.5 text-[0.86rem] text-ivory/65 transition-colors hover:text-ivory"
        >
          <ExternalLink className="size-[1.05rem]" strokeWidth={1.5} />
          {t.admin.shell.viewSite}
        </a>
      </nav>

      <div className="mt-auto space-y-5 px-6 pb-6 pt-10">
        <div>
          <p className="text-[0.7rem] text-muted-inverse" id="admin-lang-label">
            {t.admin.shell.language}
          </p>
          <div role="group" aria-labelledby="admin-lang-label" className="mt-2 flex border border-ivory/15">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={l === locale}
                title={LOCALE_META[l].native}
                onClick={() => setLocale(l)}
                className={cn(
                  "flex-1 py-2 text-[0.72rem] font-semibold tracking-[0.1em] transition-colors",
                  l === locale ? "bg-ivory text-espresso" : "text-ivory/60 hover:text-ivory",
                )}
              >
                {LOCALE_META[l].code}
              </button>
            ))}
          </div>
        </div>
        <div className="border border-champagne/40 p-4">
          <p className="flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.14em] text-champagne">
            <span className="size-1.5 rounded-full bg-champagne" aria-hidden />
            DEMO MODE
          </p>
          <p className="mt-1 text-[0.8rem] font-semibold">{t.admin.shell.demoMode}</p>
          <p className="mt-1.5 text-[0.74rem] leading-snug text-ivory/55">{t.admin.shell.demoModeText}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 flex items-center gap-2 text-[0.76rem] font-semibold text-ivory/80 underline-offset-4 hover:text-ivory hover:underline"
          >
            <RotateCcw className="size-3.5" strokeWidth={1.75} />
            {t.admin.shell.resetDemo}
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoNotice() {
  const { t } = useAdminI18n();
  const [prefs, setPrefs] = usePreferences();
  const persistent = useSyncExternalStore(
    () => () => {},
    () => getRepositories().persistent,
    () => true,
  );

  return (
    <>
      {!persistent && (
        <p role="alert" className="mb-4 border-l-2 border-error bg-error/8 px-4 py-3 text-sm text-error">
          {t.admin.notice.memoryOnly}
        </p>
      )}
      <AnimatePresence initial={false}>
        {!prefs.adminNoticeDismissed && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            aria-labelledby="demo-notice-title"
          >
            <div className="mb-8 flex flex-col gap-4 border border-champagne/50 bg-ivory p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="demo-notice-title" className="text-[0.92rem] font-bold">
                  {t.admin.notice.title}
                </h2>
                <p className="mt-1.5 max-w-4xl text-[0.82rem] leading-relaxed text-espresso/70">{t.admin.notice.text}</p>
              </div>
              <button
                type="button"
                onClick={() => setPrefs({ adminNoticeDismissed: true })}
                className={cn(buttonStyles("secondary", "sm"), "shrink-0")}
              >
                {t.admin.notice.dismiss}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function GlobalSearch() {
  const { locale, t } = useAdminI18n();
  const router = useGuardedRouter();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const { data } = useQuery(
    async (r) => ({ projects: await r.projects.list(), services: await r.services.list() }),
    ["projects", "services"],
  );

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q || !data) return [];
    const projects = data.projects
      .filter((p) => [p.slug, ...LOCALES.flatMap((l) => [p.title[l], p.location[l]])].join(" ").toLowerCase().includes(q))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        group: t.admin.shell.searchProjects,
        label: localized(p.title, locale) || p.title.ru,
        meta: p.status === "published" ? t.admin.projects.statusPublished : t.admin.projects.statusDraft,
        href: `/admin/projects/${p.id}`,
      }));
    const services = data.services
      .filter((s) => LOCALES.map((l) => s.title[l]).join(" ").toLowerCase().includes(q))
      .slice(0, 4)
      .map((s) => ({
        id: s.id,
        group: t.admin.shell.searchServices,
        label: localized(s.title, locale) || s.title.ru,
        meta: s.visible ? t.admin.services.visible : t.admin.services.hidden,
        href: `/admin/services?edit=${s.id}`,
      }));
    return [...projects, ...services];
  }, [term, data, locale, t]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setTerm("");
    router.push(href);
  };

  return (
    <div ref={boxRef} className="relative ml-auto w-full min-w-0 max-w-[22rem] flex-1 lg:ml-0 lg:mr-auto">
      <label className="relative flex items-center">
        <span className="sr-only">{t.admin.shell.search}</span>
        <Search className="pointer-events-none absolute left-3 size-4 text-muted" strokeWidth={1.5} />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && !!term}
          aria-controls="admin-search-results"
          aria-autocomplete="list"
          value={term}
          placeholder={t.admin.shell.searchPlaceholder}
          onChange={(e) => {
            setTerm(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              go(results[active].href);
            }
          }}
          className="h-10 w-full border border-espresso/12 bg-white/60 pl-9 pr-3 text-[0.84rem] outline-none placeholder:text-muted focus:border-espresso/50 focus:bg-white"
        />
      </label>
      {open && term.trim() && (
        <div
          id="admin-search-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-[60vh] overflow-y-auto border border-espresso/12 bg-ivory py-1 shadow-[0_18px_40px_-20px_rgb(33_29_28/0.45)]"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">{t.admin.shell.searchEmpty}</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.href)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left",
                  i === active && "bg-espresso/6",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.86rem] font-medium">{r.label}</span>
                  <span className="text-[0.7rem] text-muted">{r.group}</span>
                </span>
                <span className="shrink-0 text-[0.7rem] text-muted">{r.meta}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
