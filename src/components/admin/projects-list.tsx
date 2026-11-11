"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SmartImage } from "@/components/shared/smart-image";
import { useQuery } from "@/hooks/use-data";
import { CATEGORY_IDS, localized, type CategoryId, type Project } from "@/lib/domain/types";
import { fmt, formatDate, LOCALES, LOCALE_META, plural } from "@/lib/i18n";
import { getRepositories, isRepositoryError } from "@/lib/repositories";
import { cn, moveItem } from "@/lib/utils";
import { GuardedLink, useAdminI18n, useConfirm, useToast } from "./admin-context";
import {
  ActionMenu,
  buttonStyles,
  EmptyState,
  ErrorBlock,
  IconButton,
  inputClass,
  LoadingBlock,
  PageHeader,
  StatusBadge,
  type MenuItem,
} from "./ui";

type StatusFilter = "all" | "published" | "draft";

function missingLangs(p: Project) {
  return LOCALES.filter((l) => !p.title[l].trim() || !p.location[l].trim() || !p.description[l].trim());
}

export function ProjectsList() {
  const { locale, t, error: errorText } = useAdminI18n();
  const a = t.admin.projects;
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: projects, error, loading } = useQuery((r) => r.projects.list(), ["projects"]);

  const [term, setTerm] = useState(params.get("q") ?? "");
  const status = (["published", "draft"].includes(params.get("status") ?? "") ? params.get("status") : "all") as StatusFilter;
  const category = (CATEGORY_IDS as readonly string[]).includes(params.get("category") ?? "")
    ? (params.get("category") as CategoryId)
    : null;
  const featuredOnly = params.get("featured") === "1";
  const [busy, setBusy] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (projects ?? []).filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (category && p.category !== category) return false;
      if (featuredOnly && !p.featured) return false;
      if (q) {
        const hay = [p.slug, ...LOCALES.flatMap((l) => [p.title[l], p.location[l]])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [projects, term, status, category, featuredOnly]);

  const filtersActive = status !== "all" || !!category || featuredOnly || !!term.trim();
  const canReorder = !filtersActive && (projects?.length ?? 0) > 1;

  const run = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(id);
    try {
      await fn();
      toast({ message: success });
    } catch (e) {
      if (isRepositoryError(e) && e.code === "validation") {
        toast({
          message: a.publishBlocked,
          tone: "error",
          action: { label: a.openEditor, href: `/admin/projects/${id}` },
        });
      } else {
        toast({ message: errorText(e), tone: "error" });
      }
    } finally {
      setBusy(null);
    }
  };

  const repo = () => getRepositories().projects;

  const remove = async (p: Project) => {
    const ok = await confirm({
      title: fmt(a.deleteTitle, { title: localized(p.title, locale) || p.title.ru }),
      text: a.deleteText,
      confirmLabel: a.delete,
      tone: "danger",
    });
    if (ok) await run(p.id, () => repo().delete(p.id), a.deleted);
  };

  const move = async (from: number, to: number) => {
    if (!projects || !canReorder) return;
    const next = moveItem(projects, from, to);
    if (next === projects) return;
    await run("order", () => repo().reorder(next.map((p) => p.id)), a.reordered);
  };

  const menuFor = (p: Project, index: number): MenuItem[] => [
    { label: a.edit, icon: <Pencil className="size-4" />, onSelect: () => router.push(`/admin/projects/${p.id}`) },
    {
      label: a.view,
      icon: <Eye className="size-4" />,
      hidden: p.status !== "published",
      onSelect: () => window.open(`/${locale}/projects/${p.slug}`, "_blank", "noopener"),
    },
    {
      label: p.status === "published" ? a.unpublish : a.publish,
      icon: p.status === "published" ? <EyeOff className="size-4" /> : <Send className="size-4" />,
      onSelect: () =>
        run(
          p.id,
          () => repo().setStatus(p.id, p.status === "published" ? "draft" : "published"),
          p.status === "published" ? a.unpublished : a.published,
        ),
    },
    {
      label: p.featured ? a.unfeature : a.feature,
      icon: <Star className="size-4" />,
      onSelect: () => run(p.id, () => repo().setFeatured(p.id, !p.featured), p.featured ? a.featuredOff : a.featuredOn),
    },
    { label: a.duplicate, icon: <Copy className="size-4" />, onSelect: () => run(p.id, () => repo().duplicate(p.id), a.duplicated) },
    {
      label: t.admin.common.moveUp,
      icon: <ArrowUp className="size-4" />,
      hidden: !canReorder || index === 0,
      onSelect: () => move(index, index - 1),
    },
    {
      label: t.admin.common.moveDown,
      icon: <ArrowDown className="size-4" />,
      hidden: !canReorder || index === (projects?.length ?? 0) - 1,
      onSelect: () => move(index, index + 1),
    },
    { label: a.delete, icon: <Trash2 className="size-4" />, tone: "danger", onSelect: () => remove(p) },
  ];

  const categorySelect = (p: Project) => (
    <select
      aria-label={`${a.colCategory}: ${localized(p.title, locale) || p.title.ru}`}
      value={p.category}
      disabled={busy === p.id}
      onChange={(e) => run(p.id, () => repo().setCategory(p.id, e.target.value as CategoryId), a.categoryChanged)}
      className="w-full max-w-[16.5rem] cursor-pointer border border-transparent bg-transparent py-1.5 pr-6 text-[0.8rem] text-espresso/80 outline-none hover:border-espresso/20 focus:border-espresso/50"
    >
      {CATEGORY_IDS.map((c) => (
        <option key={c} value={c}>
          {t.categories[c]}
        </option>
      ))}
    </select>
  );

  const featuredToggle = (p: Project) => (
    <IconButton
      label={p.featured ? a.unfeature : a.feature}
      pressed={p.featured}
      disabled={busy === p.id}
      onClick={() => run(p.id, () => repo().setFeatured(p.id, !p.featured), p.featured ? a.featuredOff : a.featuredOn)}
      className={p.featured ? "text-bronze" : "text-espresso/55"}
    >
      <Star className="size-[1.1rem]" strokeWidth={1.5} fill={p.featured ? "currentColor" : "none"} />
    </IconButton>
  );

  const titleCell = (p: Project) => {
    const missing = missingLangs(p);
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden">
          <SmartImage src={p.cover} alt="" sizes="56px" />
        </div>
        <div className="min-w-0">
          <GuardedLink href={`/admin/projects/${p.id}`} className="block truncate text-[0.9rem] font-semibold hover:underline">
            {localized(p.title, locale) || p.title.ru || a.untitled}
          </GuardedLink>
          <p className="truncate text-[0.72rem] text-muted">/{p.slug}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {p.isDemo && (
              <span className="border border-espresso/15 px-1.5 text-[0.62rem] font-semibold text-muted">{a.demoTag}</span>
            )}
            {missing.length > 0 && (
              <span className="bg-champagne/15 px-1.5 text-[0.62rem] font-semibold text-bronze">
                {fmt(a.missingLangs, { langs: missing.map((l) => LOCALE_META[l].code).join(", ") })}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.title}
        lead={a.lead}
        actions={
          <GuardedLink href="/admin/projects/new" className={buttonStyles("primary")}>
            <Plus className="size-4" strokeWidth={2} />
            {t.admin.shell.newProject}
          </GuardedLink>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative flex flex-1 items-center">
          <span className="sr-only">{t.admin.shell.search}</span>
          <Search className="pointer-events-none absolute left-3 size-4 text-muted" strokeWidth={1.5} />
          <input
            type="search"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setParam({ q: e.target.value.trim() || null });
            }}
            placeholder={a.searchPlaceholder}
            className={cn(inputClass, "pl-9")}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 xl:flex-none">
          <div role="group" aria-label={a.status} className="flex border border-espresso/15 bg-white/50">
            {(["all", "published", "draft"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setParam({ status: s === "all" ? null : s })}
                className={cn(
                  "px-3 py-2 text-[0.78rem] font-semibold transition-colors",
                  status === s ? "bg-espresso text-ivory" : "text-espresso/65 hover:text-espresso",
                )}
              >
                {s === "all" ? a.statusAll : s === "published" ? a.filterPublished : a.filterDraft}
              </button>
            ))}
          </div>
          <select
            aria-label={a.category}
            value={category ?? ""}
            onChange={(e) => setParam({ category: e.target.value || null })}
            className={cn(inputClass.replace("w-full ", ""), "w-56 py-2 text-[0.8rem]")}
          >
            <option value="">{a.categoryAll}</option>
            {CATEGORY_IDS.map((c) => (
              <option key={c} value={c}>
                {t.categories[c]}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={featuredOnly}
            onClick={() => setParam({ featured: featuredOnly ? null : "1" })}
            className={cn(
              "flex items-center gap-2 border px-3 py-2 text-[0.78rem] font-semibold transition-colors",
              featuredOnly ? "border-espresso bg-espresso text-ivory" : "border-espresso/15 bg-white/50 text-espresso/70",
            )}
          >
            <Star className="size-3.5" strokeWidth={1.75} fill={featuredOnly ? "currentColor" : "none"} />
            {a.featuredOnly}
          </button>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                router.replace(pathname, { scroll: false });
              }}
              className="px-2 py-2 text-[0.78rem] font-semibold text-muted underline-offset-4 hover:text-espresso hover:underline"
            >
              {a.resetFilters}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.75rem] text-muted">
        <span className="tabular-nums">{projects ? plural(locale, filtered.length, a.count) : " "}</span>
        {filtersActive && projects && projects.length > 1 && <span>{a.reorderHint}</span>}
      </div>

      {error ? (
        <ErrorBlock onRetry={() => window.location.reload()} />
      ) : loading && !projects ? (
        <LoadingBlock rows={5} />
      ) : !projects || projects.length === 0 ? (
        <div className="border border-espresso/10 bg-white/40">
          <EmptyState
            icon={<FolderOpen className="size-6" strokeWidth={1.25} />}
            title={a.emptyTitle}
            text={a.emptyText}
            action={
              <GuardedLink href="/admin/projects/new" className={buttonStyles("primary")}>
                <Plus className="size-4" />
                {t.admin.shell.newProject}
              </GuardedLink>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-espresso/10 bg-white/40">
          <EmptyState
            icon={<Search className="size-6" strokeWidth={1.25} />}
            title={a.noResultsTitle}
            text={a.noResultsText}
            action={
              <button
                type="button"
                className={buttonStyles("secondary")}
                onClick={() => {
                  setTerm("");
                  router.replace(pathname, { scroll: false });
                }}
              >
                {a.resetFilters}
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden border border-espresso/10 bg-white/45 lg:block">
            <table className="w-full table-fixed text-left">
              <thead className="border-b border-espresso/10 text-[0.7rem] font-semibold text-muted">
                <tr>
                  <th scope="col" className="w-12 py-3 pl-3">
                    <span className="sr-only">{a.colOrder}</span>
                  </th>
                  <th scope="col" className="py-3 pr-4">{a.colProject}</th>
                  <th scope="col" className="w-64 py-3 pr-4">{a.colCategory}</th>
                  <th scope="col" className="w-32 py-3 pr-4">{a.colStatus}</th>
                  <th scope="col" className="w-20 py-3 pr-4 text-center">{a.colFeatured}</th>
                  <th scope="col" className="w-28 py-3 pr-4">{a.colUpdated}</th>
                  <th scope="col" className="w-14 py-3 pr-3">
                    <span className="sr-only">{t.admin.common.more}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const index = projects.findIndex((x) => x.id === p.id);
                  return (
                    <tr
                      key={p.id}
                      draggable={canReorder}
                      onDragStart={(e) => {
                        setDragFrom(index);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        if (dragFrom === null) return;
                        e.preventDefault();
                        setDragOver(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragFrom !== null) void move(dragFrom, index);
                        setDragFrom(null);
                        setDragOver(null);
                      }}
                      onDragEnd={() => {
                        setDragFrom(null);
                        setDragOver(null);
                      }}
                      className={cn(
                        "border-b border-espresso/8 transition-colors last:border-b-0 hover:bg-white/70",
                        busy === p.id && "opacity-50",
                        dragFrom === index && "opacity-40",
                        dragOver === index && dragFrom !== index && "bg-champagne/12 shadow-[inset_0_2px_0_var(--color-champagne)]",
                      )}
                    >
                      <td className="py-3 pl-3 align-middle">
                        <span
                          className={cn(
                            "grid size-8 place-items-center",
                            canReorder ? "cursor-grab text-muted active:cursor-grabbing" : "text-espresso/15",
                          )}
                          title={canReorder ? t.admin.common.dragHandle : a.reorderHint}
                          aria-hidden
                        >
                          <GripVertical className="size-4" />
                        </span>
                      </td>
                      <td className="py-3 pr-4">{titleCell(p)}</td>
                      <td className="py-3 pr-4">{categorySelect(p)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <div className="inline-flex">{featuredToggle(p)}</div>
                      </td>
                      <td className="py-3 pr-4 text-[0.75rem] tabular-nums text-muted">
                        {formatDate(locale, p.updatedAt)}
                      </td>
                      <td className="py-3 pr-3">
                        <ActionMenu items={menuFor(p, index)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 lg:hidden">
            {filtered.map((p) => {
              const index = projects.findIndex((x) => x.id === p.id);
              return (
                <li key={p.id} className={cn("border border-espresso/10 bg-white/50 p-4", busy === p.id && "opacity-50")}>
                  <div className="flex items-start justify-between gap-2">
                    {titleCell(p)}
                    <ActionMenu items={menuFor(p, index)} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-espresso/8 pt-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      {featuredToggle(p)}
                    </div>
                    {categorySelect(p)}
                  </div>
                  {canReorder && (
                    <div className="mt-2 flex justify-end gap-1 border-t border-espresso/8 pt-2">
                      <IconButton label={t.admin.common.moveUp} disabled={index === 0} onClick={() => move(index, index - 1)}>
                        <ArrowUp className="size-4" />
                      </IconButton>
                      <IconButton
                        label={t.admin.common.moveDown}
                        disabled={index === projects.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        <ArrowDown className="size-4" />
                      </IconButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
