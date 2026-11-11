"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ChevronLeft, ExternalLink, Eye, Save, Trash2, Wand2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { LocaleProvider } from "@/components/public/locale-context";
import { getPublicDictionary } from "@/lib/i18n/dictionaries";
import { ProjectDetail } from "@/components/public/project-detail";
import { Modal } from "@/components/shared/modal";
import { useQuery } from "@/hooks/use-data";
import {
  CATEGORY_IDS,
  localizedTextSchema,
  PROJECT_STATUSES,
  type Project,
  type ProjectInput,
} from "@/lib/domain/types";
import { LIMITS, slugify, validateProject } from "@/lib/domain/validation";
import { fmt, formatDateTime, LOCALES, LOCALE_META, type Locale } from "@/lib/i18n";
import { getRepositories, isRepositoryError } from "@/lib/repositories";
import { cn } from "@/lib/utils";
import {
  encodeIssue,
  GuardedLink,
  useAdminI18n,
  useConfirm,
  useGuardedRouter,
  useToast,
  useUnsavedChanges,
} from "./admin-context";
import { CoverField, GalleryField, LocalMediaNotice } from "./media";
import { Button, describedBy, ErrorBlock, Field, inputClass, LangTabs, LoadingBlock, Panel, Switch } from "./ui";

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */

const baseSchema = z.object({
  slug: z.string(),
  category: z.enum(CATEGORY_IDS),
  year: z.string(),
  area: z.string(),
  title: localizedTextSchema,
  location: localizedTextSchema,
  description: localizedTextSchema,
  cover: z.string().nullable(),
  gallery: z.array(z.string()),
  featured: z.boolean(),
  status: z.enum(PROJECT_STATUSES),
});
type FormValues = z.infer<typeof baseSchema>;

function toInput(v: FormValues): ProjectInput {
  const year = v.year.trim() === "" ? Number.NaN : Number(v.year.trim());
  const area = v.area.trim() === "" ? null : Number(v.area.trim().replace(",", "."));
  return {
    slug: v.slug.trim(),
    category: v.category,
    title: v.title,
    location: v.location,
    description: v.description,
    year,
    area,
    cover: v.cover,
    gallery: v.gallery,
    featured: v.featured,
    status: v.status,
  };
}

/** Zod runs the shared domain rules, so form and repository validate identically. */
const formSchema = baseSchema.superRefine((values, ctx) => {
  for (const issue of validateProject(toInput(values))) {
    ctx.addIssue({ code: "custom", path: issue.path.split("."), message: encodeIssue(issue) });
  }
});

function toForm(p?: Project | null): FormValues {
  if (!p) {
    return {
      slug: "",
      category: "residential",
      year: String(new Date().getFullYear()),
      area: "",
      title: { ru: "", ky: "", uz: "" },
      location: { ru: "", ky: "", uz: "" },
      description: { ru: "", ky: "", uz: "" },
      cover: null,
      gallery: [],
      featured: false,
      status: "draft",
    };
  }
  return {
    slug: p.slug,
    category: p.category,
    year: String(p.year),
    area: p.area === null ? "" : String(p.area),
    title: { ...p.title },
    location: { ...p.location },
    description: { ...p.description },
    cover: p.cover,
    gallery: [...p.gallery],
    featured: p.featured,
    status: p.status,
  };
}

const LOCALIZED_FIELDS = ["title", "location", "description"] as const;
const FIELD_ORDER = ["category", "year", "area", "slug", "title", "location", "description", "cover"] as const;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function ProjectEditor({ id }: { id?: string }) {
  const { t } = useAdminI18n();
  // Loaded once (no live subscription) so background changes never overwrite typing.
  const { data, loading, error } = useQuery((r) => (id ? r.projects.getById(id) : Promise.resolve(null)), [], [id]);

  if (id && error) return <ErrorBlock onRetry={() => window.location.reload()} />;
  if (id && (loading || data === undefined)) return <LoadingBlock rows={6} />;
  if (id && !data) {
    return (
      <div className="max-w-xl py-10">
        <h1 className="font-display text-5xl">{t.admin.editor.notFoundTitle}</h1>
        <p className="mt-3 text-espresso/65">{t.admin.editor.notFoundText}</p>
        <GuardedLink href="/admin/projects" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline">
          <ChevronLeft className="size-4" />
          {t.admin.editor.back}
        </GuardedLink>
      </div>
    );
  }
  return <EditorForm initial={data ?? null} />;
}

function EditorForm({ initial }: { initial: Project | null }) {
  const { locale: adminLocale, t, issue, error: errorText } = useAdminI18n();
  const e = t.admin.editor;
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const guarded = useGuardedRouter();
  const formId = useId();

  const [saved, setSaved] = useState<Project | null>(initial);
  const [tab, setTab] = useState<Locale>("ru");
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [preview, setPreview] = useState<Locale | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    setFocus,
    getValues,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: toForm(initial),
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  useUnsavedChanges(isDirty && !saving);

  const values = useWatch({ control }) as FormValues;
  const isNew = !saved;

  // Suggest the address from the Russian title until the editor changes it by hand.
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(values.title?.ru ?? ""), { shouldDirty: true });
  }, [values.title?.ru, slugTouched, setValue]);

  const complete = useMemo(
    () =>
      Object.fromEntries(
        LOCALES.map((l) => [l, LOCALIZED_FIELDS.every((f) => (values[f]?.[l] ?? "").trim().length > 0)]),
      ) as Record<Locale, boolean>,
    [values],
  );
  const langErrors = Object.fromEntries(
    LOCALES.map((l) => [l, LOCALIZED_FIELDS.some((f) => !!errors[f]?.[l])]),
  ) as Record<Locale, boolean>;

  const focusFirstError = (errs: FieldErrors<FormValues>) => {
    for (const field of FIELD_ORDER) {
      const fieldErrors = errs[field];
      if (!fieldErrors) continue;
      if ((LOCALIZED_FIELDS as readonly string[]).includes(field)) {
        const l = LOCALES.find((x) => (fieldErrors as Record<string, unknown>)[x]);
        if (l) {
          setTab(l);
          window.setTimeout(() => setFocus(`${field as "title"}.${l}`), 30);
        }
      } else if (field === "cover") {
        document.getElementById(`${formId}-cover`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setFocus(field);
      }
      return;
    }
  };

  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const langs = LOCALES.filter((l) => LOCALIZED_FIELDS.some((f) => !!errs[f]?.[l]));
    toast({
      message: langs.length
        ? `${e.fixErrors}. ${fmt(e.errorsInLangs, { langs: langs.map((l) => LOCALE_META[l].code).join(", ") })}`
        : e.fixErrors,
      tone: "error",
    });
    focusFirstError(errs);
  };

  const onValid = async (v: FormValues) => {
    const repo = getRepositories().projects;
    const input = toInput(v);
    setSaving(true);
    try {
      const result = saved ? await repo.update(saved.id, input) : await repo.create(input);
      reset(toForm(result));
      setSaved(result);
      setSlugTouched(true);
      toast({
        message: saved ? e.saved : result.status === "published" ? e.createdPublished : e.createdDraft,
        action:
          result.status === "published"
            ? { label: e.viewOnSite, onClick: () => window.open(`/${adminLocale}/projects/${result.slug}`, "_blank", "noopener") }
            : undefined,
      });
      if (!saved) router.replace(`/admin/projects/${result.id}`);
    } catch (err) {
      if (isRepositoryError(err) && err.issues.length) {
        const fieldErrors: FieldErrors<FormValues> = {};
        for (const i of err.issues) {
          setError(i.path as "slug", { type: "server", message: encodeIssue(i) });
          const [head, sub] = i.path.split(".");
          (fieldErrors as Record<string, unknown>)[head!] = sub ? { [sub]: true } : true;
        }
        onInvalid(fieldErrors);
      } else {
        toast({ message: errorText(err), tone: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!saved) return;
    const ok = await confirm({
      title: fmt(t.admin.projects.deleteTitle, { title: saved.title[adminLocale] || saved.title.ru }),
      text: t.admin.projects.deleteText,
      confirmLabel: t.admin.projects.delete,
      tone: "danger",
    });
    if (!ok) return;
    try {
      await getRepositories().projects.delete(saved.id);
      reset(getValues()); // clear dirty state before leaving
      toast({ message: t.admin.projects.deleted });
      router.replace("/admin/projects");
    } catch (err) {
      toast({ message: errorText(err), tone: "error" });
    }
  };

  const previewProject: Project = {
    ...(saved ?? {
      id: "preview",
      order: 0,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    }),
    ...toInput(values),
    year: Number.isFinite(Number(values.year)) ? Number(values.year) : new Date().getFullYear(),
    area: values.area && Number.isFinite(Number(values.area.replace(",", "."))) ? Number(values.area.replace(",", ".")) : null,
  };

  const saveLabel =
    values.status === "draft" ? e.saveDraft : saved?.status === "published" ? e.saveChanges : e.savePublish;
  const err = (path: string) => {
    const parts = path.split(".");
    let node: unknown = errors;
    for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
    return issue((node as { message?: string } | undefined)?.message);
  };
  const fid = (name: string) => `${formId}-${name.replace(/\./g, "-")}`;

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-espresso/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <GuardedLink
            href="/admin/projects"
            className="mb-3 inline-flex items-center gap-1 text-[0.78rem] font-semibold text-muted hover:text-espresso"
          >
            <ChevronLeft className="size-4" />
            {e.back}
          </GuardedLink>
          <h1 className="font-display text-[2.4rem] leading-[0.95] sm:text-5xl">
            {isNew ? e.newTitle : values.title?.[adminLocale] || values.title?.ru || e.editTitle}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] text-muted">
            {saved && <span>{fmt(t.admin.common.savedAt, { time: formatDateTime(adminLocale, saved.updatedAt) })}</span>}
            {isDirty && (
              <span className="flex items-center gap-1.5 font-semibold text-bronze" role="status">
                <span className="size-1.5 rounded-full bg-champagne" aria-hidden />
                {t.admin.common.unsavedBadge}
              </span>
            )}
            {saved?.isDemo && <span>{e.demoProject}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPreview(tab)}>
            <Eye className="size-4" />
            {e.preview}
          </Button>
          {saved?.status === "published" && (
            <a
              href={`/${adminLocale}/projects/${saved.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 border border-espresso/20 px-4 text-[0.82rem] font-semibold hover:border-espresso/60"
            >
              <ExternalLink className="size-4" />
              {e.viewOnSite}
            </a>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Basics */}
          <Panel title={e.basics} id={`${formId}-basics`}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={e.category} htmlFor={fid("category")} error={err("category")}>
                <select id={fid("category")} {...register("category")} className={inputClass}>
                  {CATEGORY_IDS.map((c) => (
                    <option key={c} value={c}>
                      {t.categories[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label={e.year} htmlFor={fid("year")} error={err("year")}>
                  <input
                    id={fid("year")}
                    {...register("year")}
                    inputMode="numeric"
                    aria-invalid={!!errors.year}
                    aria-describedby={describedBy(fid("year"), err("year"))}
                    className={inputClass}
                  />
                </Field>
                {/* "optional" as a hint keeps the label on one line, so Year and Area inputs align. */}
                <Field label={e.area} htmlFor={fid("area")} error={err("area")} hint={t.admin.common.optional}>
                  <input
                    id={fid("area")}
                    {...register("area")}
                    inputMode="decimal"
                    aria-invalid={!!errors.area}
                    aria-describedby={describedBy(fid("area"), err("area"), true)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field
                label={e.slug}
                htmlFor={fid("slug")}
                error={err("slug")}
                hint={fmt(e.slugHint, { slug: values.slug || "…" })}
                className="sm:col-span-2"
              >
                <div className="flex gap-2">
                  <input
                    id={fid("slug")}
                    {...register("slug", {
                      onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
                        setSlugTouched(true);
                        const next = ev.target.value.toLowerCase().replace(/\s+/g, "-");
                        if (next !== ev.target.value) setValue("slug", next, { shouldDirty: true });
                      },
                    })}
                    spellCheck={false}
                    autoCapitalize="off"
                    aria-invalid={!!errors.slug}
                    aria-describedby={describedBy(fid("slug"), err("slug"), true)}
                    className={cn(inputClass, "font-mono text-[0.82rem]")}
                  />
                  <Button
                    onClick={() => {
                      setValue("slug", slugify(getValues("title.ru")), { shouldDirty: true, shouldValidate: !!errors.slug });
                    }}
                    title={e.generateSlug}
                    aria-label={e.generateSlug}
                    className="shrink-0 px-3"
                  >
                    <Wand2 className="size-4" />
                    <span className="hidden sm:inline">{e.generateSlug}</span>
                  </Button>
                </div>
              </Field>
            </div>
          </Panel>

          {/* Texts */}
          <Panel title={e.content} hint={e.contentHint} id={`${formId}-content`}>
            <div className="-mx-5 -mt-5 mb-6 sm:-mx-6 sm:-mt-6">
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
                className="space-y-5"
              >
                <Field
                  label={`${e.title} (${LOCALE_META[l].code})`}
                  htmlFor={fid(`title.${l}`)}
                  error={err(`title.${l}`)}
                  counter={{ value: (values.title?.[l] ?? "").length, max: LIMITS.title }}
                >
                  <input
                    id={fid(`title.${l}`)}
                    {...register(`title.${l}`)}
                    aria-invalid={!!errors.title?.[l]}
                    aria-describedby={describedBy(fid(`title.${l}`), err(`title.${l}`))}
                    className={cn(inputClass, "font-display text-[1.35rem] py-2")}
                  />
                </Field>
                <Field
                  label={`${e.location} (${LOCALE_META[l].code})`}
                  htmlFor={fid(`location.${l}`)}
                  error={err(`location.${l}`)}
                >
                  <input
                    id={fid(`location.${l}`)}
                    {...register(`location.${l}`)}
                    aria-invalid={!!errors.location?.[l]}
                    aria-describedby={describedBy(fid(`location.${l}`), err(`location.${l}`))}
                    className={inputClass}
                  />
                </Field>
                <Field
                  label={`${e.description} (${LOCALE_META[l].code})`}
                  htmlFor={fid(`description.${l}`)}
                  error={err(`description.${l}`)}
                  hint={e.descriptionHint}
                  counter={{ value: (values.description?.[l] ?? "").length, max: LIMITS.description }}
                >
                  <textarea
                    id={fid(`description.${l}`)}
                    {...register(`description.${l}`)}
                    rows={9}
                    aria-invalid={!!errors.description?.[l]}
                    aria-describedby={describedBy(fid(`description.${l}`), err(`description.${l}`), true)}
                    className={cn(inputClass, "resize-y leading-relaxed")}
                  />
                </Field>
              </div>
            ))}
          </Panel>

          {/* Images */}
          <Panel title={e.cover} hint={e.coverHint} id={`${formId}-cover-title`}>
            <Controller
              control={control}
              name="cover"
              render={({ field }) => (
                <CoverField
                  id={`${formId}-cover`}
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  alt={values.title?.ru ?? ""}
                  error={err("cover")}
                />
              )}
            />
          </Panel>

          <Panel title={e.gallery} hint={e.galleryHint} id={`${formId}-gallery-title`}>
            <Controller
              control={control}
              name="gallery"
              render={({ field }) => (
                <GalleryField
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  onMakeCover={(ref) => setValue("cover", ref, { shouldDirty: true, shouldValidate: !!errors.cover })}
                  alt={values.title?.ru ?? ""}
                />
              )}
            />
          </Panel>
          <LocalMediaNotice />
        </div>

        {/* Publication sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:col-span-4">
          <Panel title={e.publication} id={`${formId}-publication`}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <fieldset>
                  <legend className="sr-only">{t.admin.projects.status}</legend>
                  <div className="grid grid-cols-2 border border-espresso/15">
                    {(["draft", "published"] as const).map((s) => (
                      <label
                        key={s}
                        className={cn(
                          "flex cursor-pointer items-center justify-center gap-2 px-3 py-2.5 text-[0.8rem] font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-champagne",
                          field.value === s ? "bg-espresso text-ivory" : "text-espresso/65 hover:text-espresso",
                        )}
                      >
                        <input
                          type="radio"
                          name={field.name}
                          value={s}
                          checked={field.value === s}
                          onChange={() => field.onChange(s)}
                          className="sr-only"
                        />
                        <span
                          className={cn("size-1.5 rounded-full", s === "published" ? "bg-success" : "bg-current opacity-50")}
                          aria-hidden
                        />
                        {s === "draft" ? e.statusDraft : e.statusPublished}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[0.75rem] leading-snug text-muted">
                    {field.value === "draft" ? e.statusDraftHint : e.statusPublishedHint}
                  </p>
                </fieldset>
              )}
            />
            <div className="mt-6 border-t border-espresso/10 pt-5">
              <Controller
                control={control}
                name="featured"
                render={({ field }) => (
                  <Switch checked={field.value} onChange={field.onChange} label={e.featured} hint={e.featuredHint} />
                )}
              />
            </div>
            <div className="mt-6 hidden space-y-2 border-t border-espresso/10 pt-5 lg:block">
              <Button type="submit" variant="primary" loading={saving} className="w-full">
                {!saving && <Save className="size-4" />}
                {saving ? t.admin.common.saving : saveLabel}
              </Button>
              <Button onClick={() => guarded.push("/admin/projects")} className="w-full" disabled={saving}>
                {t.admin.common.cancel}
              </Button>
            </div>
          </Panel>
          {saved && (
            <Button variant="danger" onClick={remove} className="w-full">
              <Trash2 className="size-4" />
              {e.delete}
            </Button>
          )}
        </aside>
      </div>

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-espresso/10 bg-ivory/95 p-3 backdrop-blur lg:hidden">
        <Button onClick={() => guarded.push("/admin/projects")} disabled={saving} className="flex-1">
          {t.admin.common.cancel}
        </Button>
        <Button type="submit" variant="primary" loading={saving} className="flex-2">
          {saving ? t.admin.common.saving : saveLabel}
        </Button>
      </div>

      {/* Preview */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} variant="fullscreen" label={e.previewTitle}>
        {preview && (
          <div className="flex h-full flex-col bg-ivory text-espresso">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-espresso/10 bg-ivory px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-[0.9rem] font-bold">{e.previewTitle}</p>
                <p className="hidden text-[0.72rem] text-muted sm:block">{e.previewNote}</p>
              </div>
              <div className="flex items-center gap-2">
                <div role="group" aria-label="RU / KY / UZ" className="flex border border-espresso/15">
                  {LOCALES.map((l) => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={preview === l}
                      onClick={() => setPreview(l)}
                      className={cn(
                        "px-3 py-2 text-[0.75rem] font-semibold",
                        preview === l ? "bg-espresso text-ivory" : "text-muted hover:text-espresso",
                      )}
                    >
                      {LOCALE_META[l].code}
                    </button>
                  ))}
                </div>
                <Button onClick={() => setPreview(null)} aria-label={e.closePreview}>
                  <X className="size-4" />
                  <span className="hidden sm:inline">{e.closePreview}</span>
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <LocaleProvider locale={preview} t={getPublicDictionary(preview)}>
                <ProjectDetail project={previewProject} preview />
              </LocaleProvider>
            </div>
          </div>
        )}
      </Modal>
    </form>
  );
}
