"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { Logo } from "@/components/shared/logo";
import { useQuery } from "@/hooks/use-data";
import { localizedTextSchema, type Settings, type SettingsInput } from "@/lib/domain/types";
import { LIMITS, validateSettings } from "@/lib/domain/validation";
import { LOCALES, LOCALE_META } from "@/lib/i18n";
import { getRepositories, isRepositoryError, resetDemoData } from "@/lib/repositories";
import { cn } from "@/lib/utils";
import { encodeIssue, useAdminI18n, useConfirm, useToast, useUnsavedChanges } from "./admin-context";
import { DropZone, LocalMediaNotice, UploadProgress, useUploader } from "./media";
import { Button, describedBy, ErrorBlock, Field, inputClass, LoadingBlock, PageHeader, Panel } from "./ui";

const citySchema = z.object({
  id: z.string(),
  name: localizedTextSchema,
  note: localizedTextSchema,
  latitude: z.string(),
  longitude: z.string(),
});

const baseSchema = z.object({
  studioName: z.string(),
  logo: z.string().nullable(),
  whatsapp: z.string(),
  instagram: z.string(),
  cities: z.array(citySchema),
  defaultLocale: z.enum(LOCALES),
  seo: z.object({ title: localizedTextSchema, description: localizedTextSchema }),
});
type Values = z.infer<typeof baseSchema>;

const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v.trim().replace(",", ".")));

function toInput(v: Values): SettingsInput {
  return {
    ...v,
    cities: v.cities.map((c) => ({ ...c, latitude: num(c.latitude), longitude: num(c.longitude) })),
  };
}

const schema = baseSchema.superRefine((v, ctx) => {
  for (const i of validateSettings(toInput(v))) {
    ctx.addIssue({
      code: "custom",
      path: i.path.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)),
      message: encodeIssue(i),
    });
  }
});

function toValues(s: Settings): Values {
  return {
    studioName: s.studioName,
    logo: s.logo,
    whatsapp: s.whatsapp,
    instagram: s.instagram,
    cities: s.cities.map((c) => ({
      id: c.id,
      name: { ...c.name },
      note: { ...c.note },
      latitude: String(c.latitude),
      longitude: String(c.longitude),
    })),
    defaultLocale: s.defaultLocale,
    seo: { title: { ...s.seo.title }, description: { ...s.seo.description } },
  };
}

export function SettingsForm() {
  const { data, error, loading } = useQuery((r) => r.settings.get(), [], []);
  if (error) return <ErrorBlock onRetry={() => window.location.reload()} />;
  if (loading || !data) return <LoadingBlock rows={6} />;
  return <SettingsEditor key={data.updatedAt} initial={data} />;
}

function SettingsEditor({ initial }: { initial: Settings }) {
  const { t, issue, error: errorText } = useAdminI18n();
  const st = t.admin.settings;
  const toast = useToast();
  const confirm = useConfirm();
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(initial) });
  const { fields, append, remove } = useFieldArray({ control, name: "cities" });
  const values = useWatch({ control }) as Values;
  useUnsavedChanges(isDirty && !saving);

  const err = (path: string) => {
    let node: unknown = errors;
    for (const p of path.split(".")) node = (node as Record<string, unknown> | undefined)?.[p];
    return issue((node as { message?: string } | undefined)?.message);
  };
  const fid = (name: string) => `${formId}-${name.replace(/\./g, "-")}`;

  const onValid = async (v: Values) => {
    setSaving(true);
    try {
      const saved = await getRepositories().settings.update(toInput(v));
      reset(toValues(saved));
      toast({ message: st.saved });
    } catch (e) {
      if (isRepositoryError(e) && e.issues.length) {
        for (const i of e.issues) setError(i.path as "studioName", { message: encodeIssue(i) });
      }
      toast({ message: errorText(e), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = (errs: FieldErrors<Values>) => {
    toast({ message: t.admin.editor.fixErrors, tone: "error" });
    const first = document.querySelector<HTMLElement>(`#${CSS.escape(formId)} [aria-invalid="true"]`);
    first?.focus();
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
    void errs;
  };

  const resetDemo = async () => {
    const ok = await confirm({
      title: t.admin.shell.resetTitle,
      text: t.admin.shell.resetText,
      confirmLabel: t.admin.shell.resetConfirm,
      tone: "danger",
    });
    if (!ok) return;
    try {
      await resetDemoData();
      const restored = await getRepositories().settings.get();
      reset(toValues(restored));
      toast({ message: t.admin.shell.resetDone });
    } catch (e) {
      toast({ message: errorText(e), tone: "error" });
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="space-y-6">
      <PageHeader title={st.title} lead={st.lead} />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Panel title={st.brand} id={`${formId}-brand`}>
          <div className="space-y-5">
            <Field label={st.studioName} htmlFor={fid("studioName")} error={err("studioName")}
              counter={{ value: values.studioName?.length ?? 0, max: LIMITS.studioName }}>
              <input
                id={fid("studioName")}
                {...register("studioName")}
                aria-invalid={!!errors.studioName}
                aria-describedby={describedBy(fid("studioName"), err("studioName"))}
                className={inputClass}
              />
            </Field>
            <Controller
              control={control}
              name="logo"
              render={({ field }) => (
                <LogoField value={field.value} onChange={field.onChange} studioName={values.studioName} />
              )}
            />
          </div>
        </Panel>

        <Panel title={st.contacts} id={`${formId}-contacts`}>
          <div className="space-y-5">
            <Field label={st.whatsapp} htmlFor={fid("whatsapp")} error={err("whatsapp")} hint={st.whatsappHint}>
              <input
                id={fid("whatsapp")}
                {...register("whatsapp")}
                type="tel"
                inputMode="tel"
                aria-invalid={!!errors.whatsapp}
                aria-describedby={describedBy(fid("whatsapp"), err("whatsapp"), true)}
                className={inputClass}
              />
            </Field>
            <Field label={st.instagram} htmlFor={fid("instagram")} error={err("instagram")}>
              <input
                id={fid("instagram")}
                {...register("instagram")}
                type="url"
                inputMode="url"
                aria-invalid={!!errors.instagram}
                aria-describedby={describedBy(fid("instagram"), err("instagram"))}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-6 border-t border-espresso/10 pt-5">
            <Field label={st.defaultLocale} htmlFor={fid("defaultLocale")} hint={st.defaultLocaleHint}>
              <select id={fid("defaultLocale")} {...register("defaultLocale")} className={inputClass}>
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {LOCALE_META[l].native} ({LOCALE_META[l].code})
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>
      </div>

      <Panel
        title={st.cities}
        hint={st.citiesHint}
        id={`${formId}-cities`}
        actions={
          <Button
            size="sm"
            onClick={() =>
              append({
                id: `city_${Date.now().toString(36)}`,
                name: { ru: "", ky: "", uz: "" },
                note: { ru: "", ky: "", uz: "" },
                latitude: "",
                longitude: "",
              })
            }
          >
            <Plus className="size-3.5" />
            {st.addCity}
          </Button>
        }
      >
        <ol className="space-y-6">
          {fields.map((field, i) => (
            <li key={field.id} className="border border-espresso/10 bg-ivory/50 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="font-display text-2xl">{values.cities?.[i]?.name.ru || st.newCity}</p>
                <Button size="sm" variant="danger" onClick={() => remove(i)} disabled={fields.length <= 1}>
                  <Trash2 className="size-3.5" />
                  {st.removeCity}
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {LOCALES.map((l) => (
                  <Field
                    key={l}
                    label={`${st.cityName} (${LOCALE_META[l].code})`}
                    htmlFor={fid(`cities.${i}.name.${l}`)}
                    error={err(`cities.${i}.name.${l}`)}
                  >
                    <input
                      id={fid(`cities.${i}.name.${l}`)}
                      lang={l}
                      {...register(`cities.${i}.name.${l}`)}
                      aria-invalid={!!errors.cities?.[i]?.name?.[l]}
                      className={inputClass}
                    />
                  </Field>
                ))}
                {LOCALES.map((l) => (
                  <Field
                    key={l}
                    label={`${st.cityNote} (${LOCALE_META[l].code})`}
                    htmlFor={fid(`cities.${i}.note.${l}`)}
                    error={err(`cities.${i}.note.${l}`)}
                    hint={l === "ru" ? st.cityNoteHint : undefined}
                    optional
                  >
                    <input
                      id={fid(`cities.${i}.note.${l}`)}
                      lang={l}
                      {...register(`cities.${i}.note.${l}`)}
                      aria-invalid={!!errors.cities?.[i]?.note?.[l]}
                      className={inputClass}
                    />
                  </Field>
                ))}
                <Field label={st.latitude} htmlFor={fid(`cities.${i}.latitude`)} error={err(`cities.${i}.coordinates`)}>
                  <input
                    id={fid(`cities.${i}.latitude`)}
                    {...register(`cities.${i}.latitude`)}
                    inputMode="decimal"
                    aria-invalid={!!errors.cities?.[i]?.root || !!err(`cities.${i}.coordinates`)}
                    className={inputClass}
                  />
                </Field>
                <Field label={st.longitude} htmlFor={fid(`cities.${i}.longitude`)}>
                  <input
                    id={fid(`cities.${i}.longitude`)}
                    {...register(`cities.${i}.longitude`)}
                    inputMode="decimal"
                    aria-invalid={!!err(`cities.${i}.coordinates`)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title={st.seo} hint={st.seoHint} id={`${formId}-seo`}>
        <div className="grid gap-8 xl:grid-cols-3">
          {LOCALES.map((l) => (
            <div key={l} lang={l} className="space-y-4">
              <p className="text-[0.78rem] font-bold">
                {LOCALE_META[l].code} <span className="font-normal text-muted">{LOCALE_META[l].native}</span>
              </p>
              <Field
                label={st.seoTitle}
                htmlFor={fid(`seo.title.${l}`)}
                error={err(`seo.title.${l}`)}
                counter={{ value: values.seo?.title[l]?.length ?? 0, max: LIMITS.seoTitle }}
              >
                <input
                  id={fid(`seo.title.${l}`)}
                  {...register(`seo.title.${l}`)}
                  aria-invalid={!!errors.seo?.title?.[l]}
                  className={inputClass}
                />
              </Field>
              <Field
                label={st.seoDescription}
                htmlFor={fid(`seo.description.${l}`)}
                error={err(`seo.description.${l}`)}
                counter={{ value: values.seo?.description[l]?.length ?? 0, max: LIMITS.seoDescription }}
              >
                <textarea
                  id={fid(`seo.description.${l}`)}
                  {...register(`seo.description.${l}`)}
                  rows={3}
                  aria-invalid={!!errors.seo?.description?.[l]}
                  className={cn(inputClass, "resize-y")}
                />
              </Field>
              <div className="border border-espresso/10 bg-white p-4" aria-label={st.seoPreview}>
                <p className="text-[0.66rem] text-muted">{st.seoPreview}</p>
                <p className="mt-2 truncate text-[0.72rem] text-[#3c6e47]">hermitage.kg › {l}</p>
                <p className="mt-0.5 line-clamp-1 text-[1rem] text-[#2a4a8a]">{values.seo?.title[l] || "—"}</p>
                <p className="mt-1 line-clamp-2 text-[0.78rem] leading-snug text-espresso/65">
                  {values.seo?.description[l] || "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={st.danger} id={`${formId}-danger`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-[0.84rem] leading-relaxed text-espresso/65">{st.dangerText}</p>
          <Button variant="danger" onClick={resetDemo} className="shrink-0">
            <RotateCcw className="size-4" />
            {t.admin.shell.resetDemo}
          </Button>
        </div>
      </Panel>

      {/* Save bar */}
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-espresso/10 bg-[#efebe5]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        {isDirty && (
          <span className="mr-auto flex items-center gap-1.5 text-[0.78rem] font-semibold text-bronze" role="status">
            <span className="size-1.5 rounded-full bg-champagne" aria-hidden />
            {t.admin.common.unsavedBadge}
          </span>
        )}
        <Button onClick={() => reset()} disabled={!isDirty || saving}>
          {t.admin.common.cancel}
        </Button>
        <Button type="submit" variant="primary" loading={saving} disabled={!isDirty}>
          {!saving && <Save className="size-4" />}
          {saving ? t.admin.common.saving : t.admin.common.save}
        </Button>
      </div>
    </form>
  );
}

function LogoField({
  value,
  onChange,
  studioName,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  studioName: string;
}) {
  const { t } = useAdminI18n();
  const st = t.admin.settings;
  const { jobs, upload, cancel, maxMb } = useUploader();

  return (
    <div className="space-y-3">
      <p className="text-[0.8rem] font-semibold text-espresso/85">{st.logo}</p>
      <div>
        <p className="mb-1.5 text-[0.72rem] text-muted">{st.logoPreview}</p>
        <div className="flex h-20 items-center justify-between bg-espresso px-5 text-ivory">
          <Logo name={studioName || "Hermitage"} logo={value} />
          <span className="hidden gap-4 text-[0.7rem] text-ivory/60 sm:flex" aria-hidden>
            <span>{t.nav.projects}</span>
            <span>{t.nav.services}</span>
            <span>{t.nav.contacts}</span>
          </span>
        </div>
      </div>
      {!value && <p className="text-[0.75rem] leading-snug text-muted">{st.logoHint}</p>}
      <DropZone
        multiple={false}
        compact
        maxMb={maxMb}
        onFiles={async (files) => {
          const [asset] = await upload(files.slice(0, 1));
          if (asset) onChange(asset.ref);
        }}
      />
      <UploadProgress jobs={jobs} onCancel={cancel} />
      {value && (
        <Button size="sm" onClick={() => onChange(null)}>
          <RotateCcw className="size-3.5" />
          {st.logoRemove}
        </Button>
      )}
      <LocalMediaNotice />
    </div>
  );
}
