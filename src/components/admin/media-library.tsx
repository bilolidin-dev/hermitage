"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SmartImage } from "@/components/shared/smart-image";
import { useQuery } from "@/hooks/use-data";
import { formatBytes, plural } from "@/lib/i18n";
import { getRepositories } from "@/lib/repositories";
import { cn } from "@/lib/utils";
import { useAdminI18n, useConfirm, useToast } from "./admin-context";
import { DropZone, LocalMediaNotice, UploadProgress, useUploader } from "./media";
import { ErrorBlock, IconButton, PageHeader } from "./ui";

type Filter = "all" | "local" | "demo";

export function MediaLibrary() {
  const { locale, t, error: errorText } = useAdminI18n();
  const m = t.admin.mediaPage;
  const toast = useToast();
  const confirm = useConfirm();
  const { jobs, upload, cancel, maxMb } = useUploader();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, error } = useQuery(
    async (r) => ({ assets: await r.media.list(), projects: await r.projects.list(), settings: await r.settings.get() }),
    ["media", "projects", "settings"],
  );

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data?.projects ?? []) {
      for (const ref of new Set([p.cover, ...p.gallery].filter(Boolean) as string[])) map.set(ref, (map.get(ref) ?? 0) + 1);
    }
    if (data?.settings.logo) map.set(data.settings.logo, (map.get(data.settings.logo) ?? 0) + 1);
    return map;
  }, [data]);

  const assets = (data?.assets ?? []).filter((a) => filter === "all" || a.source === filter);
  const localCount = (data?.assets ?? []).filter((a) => a.source === "local").length;

  const remove = async (id: string, ref: string) => {
    const used = usage.get(ref) ?? 0;
    const ok = await confirm({
      title: m.deleteTitle,
      text: used ? plural(locale, used, m.deleteTextUsed) : m.deleteText,
      confirmLabel: t.admin.common.delete,
      tone: "danger",
    });
    if (!ok) return;
    try {
      await getRepositories().media.remove(id);
      toast({ message: m.deleted });
    } catch (e) {
      toast({ message: errorText(e), tone: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={m.title} lead={m.lead} />
      <DropZone multiple onFiles={(files) => void upload(files)} maxMb={maxMb} />
      <UploadProgress jobs={jobs} onCancel={cancel} />
      <LocalMediaNotice />

      <div role="group" aria-label={m.title} className="flex w-fit border border-espresso/15 bg-white/50">
        {(["all", "local", "demo"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3.5 py-2 text-[0.78rem] font-semibold transition-colors",
              filter === f ? "bg-espresso text-ivory" : "text-espresso/65 hover:text-espresso",
            )}
          >
            {f === "all" ? m.filterAll : f === "local" ? `${m.filterLocal} (${localCount})` : m.filterDemo}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBlock onRetry={() => window.location.reload()} />
      ) : !data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="skeleton aspect-[4/3]" />
          ))}
        </div>
      ) : filter === "local" && assets.length === 0 ? (
        <p className="border border-dashed border-espresso/20 p-8 text-center text-sm text-muted">{m.emptyLocal}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {assets.map((asset) => {
            const used = usage.get(asset.ref) ?? 0;
            return (
              <li key={asset.id} className="border border-espresso/10 bg-white/55">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SmartImage src={asset.ref} alt={asset.name} sizes="240px" missingLabel={t.admin.mediaField.missing} />
                  <span
                    className={cn(
                      "absolute left-2 top-2 px-1.5 py-0.5 text-[0.6rem] font-bold",
                      asset.source === "local" ? "bg-espresso text-ivory" : "bg-ivory/90 text-espresso/70",
                    )}
                  >
                    {asset.source === "local" ? t.admin.mediaField.local : t.admin.mediaField.demo}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.78rem] font-semibold" title={asset.name}>
                      {asset.name}
                    </p>
                    <p className="mt-0.5 text-[0.7rem] tabular-nums text-muted">
                      {[asset.width && asset.height ? `${asset.width}×${asset.height}` : null, asset.size ? formatBytes(locale, asset.size) : null]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className={cn("mt-1 text-[0.7rem]", used ? "text-success" : "text-muted")}>
                      {used ? plural(locale, used, m.usedIn) : m.unused}
                    </p>
                  </div>
                  {asset.source === "local" ? (
                    <IconButton
                      label={t.admin.common.delete}
                      onClick={() => remove(asset.id, asset.ref)}
                      className="-mr-1 -mt-1 size-8 hover:text-error"
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  ) : (
                    <span className="sr-only">{m.demoReadonly}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[0.72rem] text-muted">{m.demoReadonly}</p>
    </div>
  );
}
