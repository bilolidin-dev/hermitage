"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/shared/modal";
import { useQuery } from "@/hooks/use-data";
import { localized, localizedTextSchema, type Service } from "@/lib/domain/types";
import { LIMITS, validateService } from "@/lib/domain/validation";
import { fmt, LOCALES, LOCALE_META, plural, type Locale } from "@/lib/i18n";
import { getRepositories, isRepositoryError } from "@/lib/repositories";
import { cn, moveItem } from "@/lib/utils";
import { encodeIssue, useAdminI18n, useConfirm, useGuard, useToast, useUnsavedChanges } from "./admin-context";
import {
  ActionMenu,
  Button,
  describedBy,
  EmptyState,
  ErrorBlock,
  Field,
  IconButton,
  inputClass,
  LangTabs,
  LoadingBlock,
  PageHeader,
  Switch,
} from "./ui";

const schema = z
  .object({ title: localizedTextSchema, description: localizedTextSchema, visible: z.boolean() })
  .superRefine((v, ctx) => {
    for (const i of validateService(v)) ctx.addIssue({ code: "custom", path: i.path.split("."), message: encodeIssue(i) });
  });
type Values = z.infer<typeof schema>;

const empty = (): Values => ({ title: { ru: "", ky: "", uz: "" }, description: { ru: "", ky: "", uz: "" }, visible: false });

export function ServicesManager() {
  const { locale, t, error: errorText } = useAdminI18n();
  const s = t.admin.services;
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: services, error, loading } = useQuery((r) => r.services.list(), ["services"]);
  const [editingState, setEditing] = useState<Service | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Deep links from search (?edit=id) and quick actions (?new=1) open the drawer directly.
  const linkedNew = params.get("new") === "1";
  const linkedEditId = params.get("edit");
  const editing: Service | "new" | null =
    editingState ?? (linkedNew ? "new" : linkedEditId ? (services?.find((x) => x.id === linkedEditId) ?? null) : null);
  const closeEditor = () => {
    setEditing(null);
    if (linkedNew || linkedEditId) router.replace(pathname, { scroll: false });
  };

  const repo = () => getRepositories().services;

  const move = async (from: number, to: number) => {
    if (!services) return;
    const next = moveItem(services, from, to);
    if (next === services) return;
    try {
      await repo().reorder(next.map((x) => x.id));
      toast({ message: s.reordered });
    } catch (e) {
      toast({ message: errorText(e), tone: "error" });
    }
  };

  const toggleVisible = async (service: Service) => {
    setBusy(service.id);
    try {
      await repo().update(service.id, { title: service.title, description: service.description, visible: !service.visible });
      toast({ message: service.visible ? s.hiddenToast : s.shown });
    } catch (e) {
      if (isRepositoryError(e) && e.code === "validation") {
        toast({ message: s.showBlocked, tone: "error", action: { label: s.editTitle, onClick: () => setEditing(service) } });
      } else toast({ message: errorText(e), tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (service: Service) => {
    const ok = await confirm({
      title: fmt(s.deleteTitle, { title: localized(service.title, locale) || service.title.ru }),
      text: s.deleteText,
      confirmLabel: t.admin.common.delete,
      tone: "danger",
    });
    if (!ok) return;
    try {
      await repo().delete(service.id);
      toast({ message: s.deleted });
    } catch (e) {
      toast({ message: errorText(e), tone: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        lead={s.lead}
        actions={
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus className="size-4" strokeWidth={2} />
            {s.add}
          </Button>
        }
      />

      {error ? (
        <ErrorBlock onRetry={() => window.location.reload()} />
      ) : loading && !services ? (
        <LoadingBlock rows={4} />
      ) : !services?.length ? (
        <div className="border border-espresso/10 bg-white/40">
          <EmptyState
            icon={<ListChecks className="size-6" strokeWidth={1.25} />}
            title={s.emptyTitle}
            text={s.emptyText}
            action={
              <Button variant="primary" onClick={() => setEditing("new")}>
                <Plus className="size-4" />
                {s.add}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <p className="text-[0.75rem] tabular-nums text-muted">{plural(locale, services.length, s.count)}</p>
          <ol className="border border-espresso/10 bg-white/45">
            {services.map((service, i) => {
              const missing = LOCALES.filter((l) => !service.title[l].trim() || !service.description[l].trim());
              return (
                <li
                  key={service.id}
                  className={cn(
                    "flex flex-col gap-3 border-b border-espresso/8 p-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-5 sm:px-5",
                    busy === service.id && "opacity-50",
                  )}
                >
                  <div className="flex shrink-0 gap-0.5 sm:flex-col">
                    <IconButton label={t.admin.common.moveUp} disabled={i === 0} onClick={() => move(i, i - 1)} className="size-8">
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton
                      label={t.admin.common.moveDown}
                      disabled={i === services.length - 1}
                      onClick={() => move(i, i + 1)}
                      className="size-8"
                    >
                      <ArrowDown className="size-4" />
                    </IconButton>
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setEditing(service)}
                      className="text-left font-display-text text-[1.6rem] leading-tight hover:underline"
                    >
                      {localized(service.title, locale) || service.title.ru}
                    </button>
                    <p className="mt-1 line-clamp-2 max-w-3xl text-[0.82rem] leading-relaxed text-muted">
                      {localized(service.description, locale) || service.description.ru}
                    </p>
                    {missing.length > 0 && (
                      <span className="mt-2 inline-block bg-champagne/15 px-1.5 text-[0.62rem] font-semibold text-bronze">
                        {fmt(t.admin.projects.missingLangs, { langs: missing.map((l) => LOCALE_META[l].code).join(", ") })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 text-[0.7rem] font-semibold",
                        service.visible ? "bg-success/10 text-success" : "bg-espresso/6 text-muted",
                      )}
                    >
                      {service.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      {service.visible ? s.visible : s.hidden}
                    </span>
                    <div className="flex items-center">
                      <IconButton label={t.admin.common.edit} onClick={() => setEditing(service)}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <ActionMenu
                        items={[
                          { label: t.admin.common.edit, icon: <Pencil className="size-4" />, onSelect: () => setEditing(service) },
                          {
                            label: service.visible ? s.hide : s.show,
                            icon: service.visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />,
                            onSelect: () => toggleVisible(service),
                          },
                          {
                            label: t.admin.common.delete,
                            icon: <Trash2 className="size-4" />,
                            tone: "danger",
                            onSelect: () => remove(service),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <ServiceDrawer editing={editing} onClose={closeEditor} />
    </div>
  );
}

function ServiceDrawer({ editing, onClose }: { editing: Service | "new" | null; onClose: () => void }) {
  const { guard } = useGuard();
  const { t } = useAdminI18n();
  return (
    <Modal open={editing !== null} onClose={() => guard(onClose)} variant="drawer" label={t.admin.services.editTitle}>
      {editing !== null && (
        <ServiceForm key={editing === "new" ? "new" : editing.id} service={editing === "new" ? null : editing} onDone={onClose} />
      )}
    </Modal>
  );
}

function ServiceForm({ service, onDone }: { service: Service | null; onDone: () => void }) {
  const { t, issue, error: errorText } = useAdminI18n();
  const s = t.admin.services;
  const toast = useToast();
  const { guard } = useGuard();
  const formId = useId();
  const [tab, setTab] = useState<Locale>("ru");
  const [saving, setSaving] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: service ? { title: { ...service.title }, description: { ...service.description }, visible: service.visible } : empty(),
    shouldFocusError: false,
  });
  useUnsavedChanges(isDirty && !saving);
  const values = useWatch({ control }) as Values;

  const complete = Object.fromEntries(
    LOCALES.map((l) => [l, !!values.title?.[l]?.trim() && !!values.description?.[l]?.trim()]),
  ) as Record<Locale, boolean>;
  const langErrors = Object.fromEntries(
    LOCALES.map((l) => [l, !!errors.title?.[l] || !!errors.description?.[l]]),
  ) as Record<Locale, boolean>;

  const onInvalid = (errs: FieldErrors<Values>) => {
    const l = LOCALES.find((x) => errs.title?.[x] || errs.description?.[x]);
    if (l) {
      setTab(l);
      window.setTimeout(() => setFocus(errs.title?.[l] ? `title.${l}` : `description.${l}`), 30);
    }
    toast({ message: t.admin.editor.fixErrors, tone: "error" });
  };

  const onValid = async (v: Values) => {
    setSaving(true);
    try {
      const repo = getRepositories().services;
      if (service) await repo.update(service.id, v);
      else await repo.create(v);
      reset(v);
      toast({ message: service ? s.saved : s.created });
      onDone();
    } catch (e) {
      if (isRepositoryError(e) && e.issues.length) {
        for (const i of e.issues) setError(i.path as "title.ru", { message: encodeIssue(i) });
      }
      toast({ message: errorText(e), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const fid = (n: string) => `${formId}-${n.replace(".", "-")}`;
  const msg = (field: "title" | "description", l: Locale) => issue(errors[field]?.[l]?.message);

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="flex h-full flex-col bg-ivory text-espresso">
      <div className="flex items-start justify-between gap-4 border-b border-espresso/10 px-5 py-5 sm:px-7">
        <div>
          <h2 className="font-display text-[2.1rem] leading-none">{service ? s.editTitle : s.newTitle}</h2>
          {isDirty && (
            <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] font-semibold text-bronze">
              <span className="size-1.5 rounded-full bg-champagne" aria-hidden />
              {t.admin.common.unsavedBadge}
            </p>
          )}
        </div>
        <IconButton label={t.admin.common.close} onClick={() => guard(onDone)}>
          <X className="size-5" />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
        <Controller
          control={control}
          name="visible"
          render={({ field }) => (
            <Switch checked={field.value} onChange={field.onChange} label={s.fieldVisible} hint={s.fieldVisibleHint} />
          )}
        />
        <div className="mt-6">
          <LangTabs value={tab} onChange={setTab} complete={complete} errors={langErrors} idPrefix={formId} />
        </div>
        {LOCALES.map((l) => (
          <div
            key={l}
            role="tabpanel"
            id={`${formId}-panel-${l}`}
            aria-labelledby={`${formId}-tab-${l}`}
            hidden={tab !== l}
            lang={l}
            className="space-y-5 pt-6"
          >
            <Field
              label={`${s.fieldTitle} (${LOCALE_META[l].code})`}
              htmlFor={fid(`title.${l}`)}
              error={msg("title", l)}
              counter={{ value: (values.title?.[l] ?? "").length, max: LIMITS.serviceTitle }}
            >
              <input
                id={fid(`title.${l}`)}
                {...register(`title.${l}`)}
                aria-invalid={!!errors.title?.[l]}
                aria-describedby={describedBy(fid(`title.${l}`), msg("title", l))}
                className={inputClass}
              />
            </Field>
            <Field
              label={`${s.fieldDescription} (${LOCALE_META[l].code})`}
              htmlFor={fid(`description.${l}`)}
              error={msg("description", l)}
              counter={{ value: (values.description?.[l] ?? "").length, max: LIMITS.serviceDescription }}
            >
              <textarea
                id={fid(`description.${l}`)}
                {...register(`description.${l}`)}
                rows={6}
                aria-invalid={!!errors.description?.[l]}
                aria-describedby={describedBy(fid(`description.${l}`), msg("description", l))}
                className={cn(inputClass, "resize-y leading-relaxed")}
              />
            </Field>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 border-t border-espresso/10 px-5 py-4 sm:px-7">
        <Button onClick={() => guard(onDone)} disabled={saving}>
          {t.admin.common.cancel}
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {saving ? t.admin.common.saving : t.admin.common.save}
        </Button>
      </div>
    </form>
  );
}
