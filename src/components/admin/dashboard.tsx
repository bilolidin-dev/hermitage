"use client";

import { AlertCircle, CheckCircle2, ExternalLink, FolderPlus, ImagePlus, ListPlus, Settings2 } from "lucide-react";
import { useQuery } from "@/hooks/use-data";
import { useNow } from "@/hooks/use-now";
import { CATEGORY_IDS, isLocalizedComplete, localized, type Project } from "@/lib/domain/types";
import { fmt, plural, relativeTime } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { GuardedLink, useAdminI18n } from "./admin-context";
import { ErrorBlock, LoadingBlock, PageHeader, Panel } from "./ui";

function isTranslated(p: Project) {
  return isLocalizedComplete(p.title) && isLocalizedComplete(p.location) && isLocalizedComplete(p.description);
}

export function Dashboard() {
  const { locale, t } = useAdminI18n();
  const d = t.admin.dashboard;
  const { data, error, loading } = useQuery(
    async (r) => ({
      projects: await r.projects.list(),
      services: await r.services.list(),
      activity: await r.activity.list(8),
      settings: await r.settings.get(),
    }),
    ["projects", "services", "activity", "settings"],
  );

  // null until hydration, so relative times never differ between server and client.
  const now = useNow();

  if (error) return <ErrorBlock onRetry={() => window.location.reload()} />;

  const projects = data?.projects ?? [];
  const published = projects.filter((p) => p.status === "published");
  const drafts = projects.filter((p) => p.status === "draft");
  const featured = projects.filter((p) => p.featured);
  const featuredPublished = published.filter((p) => p.featured);
  const untranslatedDrafts = drafts.filter((p) => !isTranslated(p));
  const hiddenServices = (data?.services ?? []).filter((s) => !s.visible);

  const stats = [
    { label: d.total, value: projects.length, href: "/admin/projects" },
    { label: d.published, value: published.length, href: "/admin/projects?status=published" },
    { label: d.drafts, value: drafts.length, href: "/admin/projects?status=draft" },
    { label: d.featured, value: featured.length, href: "/admin/projects?featured=1" },
  ];

  const byCategory = CATEGORY_IDS.map((id) => ({
    id,
    published: published.filter((p) => p.category === id).length,
    draft: drafts.filter((p) => p.category === id).length,
  }));
  const maxCount = Math.max(1, ...byCategory.map((c) => c.published + c.draft));

  const attention = [
    ...(untranslatedDrafts.length
      ? [{ text: plural(locale, untranslatedDrafts.length, d.attentionTranslations), href: "/admin/projects?status=draft" }]
      : []),
    ...(data && featuredPublished.length === 0 ? [{ text: d.attentionNoFeatured, href: "/admin/projects" }] : []),
    ...(hiddenServices.length
      ? [{ text: plural(locale, hiddenServices.length, d.attentionHiddenServices), href: "/admin/services" }]
      : []),
  ];

  const quick = [
    { label: d.qaNewProject, href: "/admin/projects/new", icon: FolderPlus },
    { label: d.qaNewService, href: "/admin/services?new=1", icon: ListPlus },
    { label: d.qaMedia, href: "/admin/media", icon: ImagePlus },
    { label: d.qaSettings, href: "/admin/settings", icon: Settings2 },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={d.title} lead={d.lead} />

      {/* Headline numbers */}
      <div className="grid grid-cols-2 border-l border-t border-espresso/10 lg:grid-cols-4">
        {stats.map((s) => (
          <GuardedLink
            key={s.label}
            href={s.href}
            className="group border-b border-r border-espresso/10 bg-white/40 p-5 transition-colors hover:bg-white/80 sm:p-6"
          >
            <p className="text-[0.78rem] font-semibold text-muted">{s.label}</p>
            <p className="mt-3 font-display text-[3.4rem] leading-none tabular-nums sm:text-6xl">
              {loading && !data ? <span className="skeleton inline-block h-12 w-12 align-middle" /> : s.value}
            </p>
          </GuardedLink>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel title={d.byCategory} id="by-category" className="xl:col-span-7">
          {!data ? (
            <LoadingBlock rows={4} />
          ) : (
            <>
              <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-[0.75rem] text-espresso/65" aria-hidden>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-4 rounded-[2px] bg-espresso" />
                  {d.categoryLegendPublished}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-4 rounded-[2px] bg-champagne/55" />
                  {d.categoryLegendDraft}
                </span>
              </div>
              <ul className="space-y-5">
                {byCategory.map((c) => {
                  const total = c.published + c.draft;
                  return (
                    <li key={c.id}>
                      <div className="flex items-baseline justify-between gap-4 text-[0.82rem]">
                        <span className="font-semibold">{t.categories[c.id]}</span>
                        <span className="tabular-nums text-muted">
                          {fmt(d.categoryRow, { published: c.published, total })}
                        </span>
                      </div>
                      <div className="mt-2 flex h-3 gap-[2px] bg-espresso/5" role="presentation">
                        {c.published > 0 && (
                          <span
                            title={`${d.categoryLegendPublished}: ${c.published}`}
                            className={cn("h-full bg-espresso", c.draft === 0 && "rounded-r-[3px]")}
                            style={{ width: `${(c.published / maxCount) * 100}%` }}
                          />
                        )}
                        {c.draft > 0 && (
                          <span
                            title={`${d.categoryLegendDraft}: ${c.draft}`}
                            className="h-full rounded-r-[3px] bg-champagne/55"
                            style={{ width: `${(c.draft / maxCount) * 100}%` }}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>

        <Panel title={d.attention} id="attention" className="xl:col-span-5">
          {!data ? (
            <LoadingBlock rows={2} />
          ) : attention.length === 0 ? (
            <p className="flex items-start gap-3 text-sm text-success">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
              {d.attentionNone}
            </p>
          ) : (
            <ul className="space-y-1">
              {attention.map((a) => (
                <li key={a.text}>
                  <GuardedLink
                    href={a.href}
                    className="-mx-2 flex items-start gap-3 px-2 py-2.5 text-sm transition-colors hover:bg-espresso/5"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-bronze" strokeWidth={1.5} />
                    {a.text}
                  </GuardedLink>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={d.activity} id="activity" className="xl:col-span-7">
          {!data ? (
            <LoadingBlock rows={3} />
          ) : data.activity.length === 0 ? (
            <p className="text-sm text-muted">{d.activityEmpty}</p>
          ) : (
            <ol className="relative space-y-4 border-l border-espresso/12 pl-5">
              {data.activity.map((a) => (
                <li key={a.id} className="relative">
                  <span aria-hidden className="absolute -left-[1.42rem] top-1.5 size-2 rounded-full border border-champagne bg-ivory" />
                  <p className="text-[0.86rem] leading-snug">
                    {fmt(t.admin.activity[a.action], {
                      label: a.label ? localized(a.label, locale) || a.label.ru : "",
                    })}
                  </p>
                  <p className="mt-0.5 text-[0.72rem] text-muted">{now ? relativeTime(locale, a.at, now) : " "}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={d.quickActions} id="quick-actions" className="xl:col-span-5">
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {quick.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <GuardedLink
                  href={href}
                  className="flex items-center gap-3 border border-espresso/10 bg-ivory/60 px-4 py-3.5 text-[0.86rem] font-semibold transition-colors hover:border-espresso/40"
                >
                  <Icon className="size-4 text-bronze" strokeWidth={1.5} />
                  {label}
                </GuardedLink>
              </li>
            ))}
            <li>
              <a
                href={`/${data?.settings.defaultLocale ?? "ru"}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 border border-espresso/10 bg-ivory/60 px-4 py-3.5 text-[0.86rem] font-semibold transition-colors hover:border-espresso/40"
              >
                <ExternalLink className="size-4 text-bronze" strokeWidth={1.5} />
                {d.qaSite}
              </a>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
