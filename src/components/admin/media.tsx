"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  GripVertical,
  ImagePlus,
  Images,
  Info,
  Replace,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Modal } from "@/components/shared/modal";
import { SmartImage } from "@/components/shared/smart-image";
import { useQuery } from "@/hooks/use-data";
import type { MediaAsset } from "@/lib/domain/types";
import { fmt, plural } from "@/lib/i18n";
import { getRepositories, isRepositoryError } from "@/lib/repositories";
import { cn, moveItem } from "@/lib/utils";
import { useAdminI18n, useToast } from "./admin-context";
import { Button, IconButton } from "./ui";

/* ------------------------------------------------------------------ */
/* Upload queue                                                        */
/* ------------------------------------------------------------------ */

interface UploadJob {
  id: string;
  name: string;
  progress: number;
  controller: AbortController;
}

export function useUploader() {
  const { t, locale } = useAdminI18n();
  const toast = useToast();
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const media = getRepositories().media;
  const maxMb = Math.round(media.maxFileSize / (1024 * 1024));

  const upload = useCallback(
    async (files: File[]): Promise<MediaAsset[]> => {
      const accepted: File[] = [];
      const errors: string[] = [];
      for (const file of files) {
        try {
          await media.validateFile(file);
          accepted.push(file);
        } catch (e) {
          const code = isRepositoryError(e) ? e.code : "unknown";
          errors.push(
            code === "file_too_large"
              ? fmt(t.admin.mediaField.tooLarge, { name: file.name, size: maxMb })
              : fmt(t.admin.mediaField.invalidType, { name: file.name }),
          );
        }
      }
      for (const message of errors) toast({ message, tone: "error" });

      const results = await Promise.all(
        accepted.map(async (file) => {
          const job: UploadJob = {
            id: `${file.name}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            progress: 0,
            controller: new AbortController(),
          };
          setJobs((list) => [...list, job]);
          try {
            return await media.upload(file, {
              signal: job.controller.signal,
              onProgress: (progress) => setJobs((list) => list.map((j) => (j.id === job.id ? { ...j, progress } : j))),
            });
          } catch (e) {
            if (!(isRepositoryError(e) && e.code === "upload_aborted")) {
              toast({ message: `${file.name}: ${t.errors[isRepositoryError(e) ? e.code : "unknown"]}`, tone: "error" });
            }
            return null;
          } finally {
            setJobs((list) => list.filter((j) => j.id !== job.id));
          }
        }),
      );
      const assets = results.filter((a): a is MediaAsset => a !== null);
      if (assets.length) toast({ message: plural(locale, assets.length, t.admin.mediaField.uploaded) });
      return assets;
    },
    [media, maxMb, t, toast, locale],
  );

  return { jobs, upload, cancel: (id: string) => jobs.find((j) => j.id === id)?.controller.abort(), maxMb };
}

export function UploadProgress({ jobs, onCancel }: { jobs: UploadJob[]; onCancel: (id: string) => void }) {
  const { t } = useAdminI18n();
  if (!jobs.length) return null;
  return (
    <ul className="space-y-2" aria-live="polite">
      {jobs.map((job) => (
        <li key={job.id} className="flex items-center gap-3 border border-espresso/10 bg-ivory/70 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-3 text-[0.75rem]">
              <span className="truncate font-medium">
                {t.admin.mediaField.uploading}: {job.name}
              </span>
              <span className="tabular-nums text-muted">{Math.round(job.progress * 100)}%</span>
            </div>
            <div
              className="mt-1.5 h-1 bg-espresso/10"
              role="progressbar"
              aria-label={job.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(job.progress * 100)}
            >
              <div className="h-full bg-espresso transition-[width] duration-200" style={{ width: `${job.progress * 100}%` }} />
            </div>
          </div>
          <IconButton label={t.admin.mediaField.cancelUpload} onClick={() => onCancel(job.id)} className="size-8">
            <X className="size-4" />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Drop zone                                                           */
/* ------------------------------------------------------------------ */

export function DropZone({
  multiple,
  onFiles,
  onLibrary,
  compact,
  maxMb,
  invalid,
  describedById,
}: {
  multiple: boolean;
  onFiles: (files: File[]) => void;
  onLibrary?: () => void;
  compact?: boolean;
  maxMb: number;
  invalid?: boolean;
  describedById?: string;
}) {
  const { t } = useAdminI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const accept = getRepositories().media.acceptedTypes.join(",");

  return (
    <div
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        const files = [...e.dataTransfer.files];
        onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "flex flex-col items-center justify-center border border-dashed text-center transition-colors",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-10",
        over ? "border-espresso bg-champagne/10" : invalid ? "border-error/60 bg-error/5" : "border-espresso/25 bg-white/40",
      )}
    >
      <Upload className={cn("text-bronze", compact ? "size-5" : "size-6")} strokeWidth={1.25} aria-hidden />
      <p className="text-[0.86rem] font-semibold">{multiple ? t.admin.mediaField.dropTitle : t.admin.mediaField.dropTitleSingle}</p>
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[0.82rem]">
        <span className="text-muted">{t.admin.mediaField.or}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-describedby={describedById}
          className="font-semibold underline decoration-champagne underline-offset-4 hover:decoration-espresso"
        >
          {t.admin.mediaField.choose}
        </button>
        {onLibrary && (
          <>
            <span className="text-espresso/35" aria-hidden>/</span>
            <button
              type="button"
              onClick={onLibrary}
              className="inline-flex items-center gap-1.5 font-semibold underline decoration-champagne underline-offset-4 hover:decoration-espresso"
            >
              <Images className="size-3.5" strokeWidth={1.5} />
              {t.admin.mediaField.fromLibrary}
            </button>
          </>
        )}
      </div>
      <p className="text-[0.72rem] text-muted">{fmt(t.admin.mediaField.formats, { size: maxMb })}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}

export function LocalMediaNotice() {
  const { t } = useAdminI18n();
  const [persistent, setPersistent] = useState(true);
  useEffect(() => {
    const media = getRepositories().media;
    void media.init().then(() => setPersistent(media.persistent));
  }, []);
  return (
    <p className="flex items-start gap-2.5 bg-champagne/10 px-3.5 py-3 text-[0.75rem] leading-relaxed text-espresso/70">
      <Info className="mt-0.5 size-3.5 shrink-0 text-bronze" strokeWidth={1.75} aria-hidden />
      {persistent ? t.admin.mediaField.localNotice : t.admin.mediaField.memoryNotice}
    </p>
  );
}

function SourceTag({ refValue }: { refValue: string }) {
  const { t } = useAdminI18n();
  const local = refValue.startsWith("local:");
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.06em]",
        local ? "bg-espresso text-ivory" : "bg-ivory/90 text-espresso/70",
      )}
    >
      {local ? t.admin.mediaField.local : t.admin.mediaField.demo}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cover (single image)                                                */
/* ------------------------------------------------------------------ */

export function CoverField({
  value,
  onChange,
  alt,
  error,
  id,
}: {
  value: string | null;
  onChange: (ref: string | null) => void;
  alt: string;
  error?: string;
  id: string;
}) {
  const { t } = useAdminI18n();
  const { jobs, upload, cancel, maxMb } = useUploader();
  const [picker, setPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const handle = async (files: File[]) => {
    const [asset] = await upload(files.slice(0, 1));
    if (asset) onChange(asset.ref);
  };

  return (
    <div className="space-y-3" id={id} tabIndex={-1}>
      {value ? (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative aspect-[16/10] overflow-hidden">
            <SmartImage src={value} alt={alt} sizes="(min-width: 1024px) 40vw, 100vw" missingLabel={t.admin.mediaField.missing} />
            <span className="absolute left-2 top-2">
              <SourceTag refValue={value} />
            </span>
          </div>
          <div className="flex flex-wrap content-start gap-2 sm:flex-col">
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Replace className="size-3.5" />
              {t.admin.mediaField.replace}
            </Button>
            <Button size="sm" onClick={() => setPicker(true)}>
              <Images className="size-3.5" />
              {t.admin.mediaField.fromLibrary}
            </Button>
            <Button size="sm" variant="danger" onClick={() => onChange(null)}>
              <Trash2 className="size-3.5" />
              {t.admin.mediaField.remove}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept={getRepositories().media.acceptedTypes.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                if (files.length) void handle(files);
              }}
            />
          </div>
        </div>
      ) : (
        <DropZone
          multiple={false}
          onFiles={handle}
          onLibrary={() => setPicker(true)}
          maxMb={maxMb}
          invalid={!!error}
          describedById={error ? `${id}-error` : undefined}
        />
      )}
      <UploadProgress jobs={jobs} onCancel={cancel} />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[0.78rem] font-medium text-error">
          {error}
        </p>
      )}
      <MediaPicker
        open={picker}
        multiple={false}
        onClose={() => setPicker(false)}
        onSelect={(refs) => {
          if (refs[0]) onChange(refs[0]);
          setPicker(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery (ordered images)                                            */
/* ------------------------------------------------------------------ */

export function GalleryField({
  value,
  onChange,
  onMakeCover,
  alt,
}: {
  value: string[];
  onChange: (refs: string[]) => void;
  onMakeCover?: (ref: string) => void;
  alt: string;
}) {
  const { t, locale } = useAdminI18n();
  const { jobs, upload, cancel, maxMb } = useUploader();
  const [picker, setPicker] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const handle = async (files: File[]) => {
    const assets = await upload(files);
    if (assets.length) onChange([...latest.current, ...assets.map((a) => a.ref)]);
  };

  return (
    <div className="space-y-4">
      <DropZone multiple compact onFiles={handle} onLibrary={() => setPicker(true)} maxMb={maxMb} />
      <UploadProgress jobs={jobs} onCancel={cancel} />

      {value.length === 0 ? (
        <p className="py-4 text-center text-[0.82rem] text-muted">{t.admin.mediaField.galleryEmpty}</p>
      ) : (
        <>
          <p className="text-[0.75rem] text-muted">
            {plural(locale, value.length, t.admin.mediaField.galleryCount)}
          </p>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {value.map((ref, i) => (
              <li
                key={`${ref}-${i}`}
                draggable
                onDragStart={(e) => {
                  setDragFrom(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  if (dragFrom === null) return;
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDrop={(e) => {
                  if (dragFrom === null) return;
                  e.preventDefault();
                  onChange(moveItem(value, dragFrom, i));
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
                className={cn(
                  "group relative border bg-white/60 transition-[opacity,border-color]",
                  dragFrom === i ? "opacity-40" : "opacity-100",
                  dragOver === i && dragFrom !== i ? "border-espresso" : "border-espresso/10",
                )}
              >
                <div className="relative aspect-[4/3] cursor-grab overflow-hidden active:cursor-grabbing">
                  <SmartImage src={ref} alt={`${alt} — ${i + 1}`} sizes="240px" missingLabel={t.admin.mediaField.missing} />
                  <span className="absolute left-2 top-2 flex items-center gap-1">
                    <span className="bg-espresso px-1.5 py-0.5 text-[0.62rem] font-bold tabular-nums text-ivory">{i + 1}</span>
                    <SourceTag refValue={ref} />
                  </span>
                  <span
                    className="absolute right-2 top-2 grid size-7 place-items-center bg-ivory/90 text-muted"
                    title={t.admin.common.dragHandle}
                    aria-hidden
                  >
                    <GripVertical className="size-3.5" />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-0.5 px-1 py-1">
                  <div className="flex">
                    <IconButton
                      size="sm"
                      label={t.admin.mediaField.moveLeft}
                      disabled={i === 0}
                      onClick={() => onChange(moveItem(value, i, i - 1))}
                    >
                      <ArrowLeft className="size-3.5" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      label={t.admin.mediaField.moveRight}
                      disabled={i === value.length - 1}
                      onClick={() => onChange(moveItem(value, i, i + 1))}
                    >
                      <ArrowRight className="size-3.5" />
                    </IconButton>
                  </div>
                  <div className="flex">
                    {onMakeCover && (
                      <IconButton size="sm" label={t.admin.mediaField.makeCover} onClick={() => onMakeCover(ref)}>
                        <Star className="size-3.5" />
                      </IconButton>
                    )}
                    <IconButton
                      size="sm"
                      label={t.admin.mediaField.remove}
                      onClick={() => onChange(value.filter((_, j) => j !== i))}
                      className="hover:text-error"
                    >
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <MediaPicker
        open={picker}
        multiple
        onClose={() => setPicker(false)}
        onSelect={(refs) => {
          onChange([...latest.current, ...refs]);
          setPicker(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Library picker                                                      */
/* ------------------------------------------------------------------ */

export function MediaPicker({
  open,
  multiple,
  onClose,
  onSelect,
}: {
  open: boolean;
  multiple: boolean;
  onClose: () => void;
  onSelect: (refs: string[]) => void;
}) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="w-[min(64rem,calc(100vw-1.5rem))]">
      {/* Mounted only while open, so the selection starts empty every time. */}
      <MediaPickerContent titleId={titleId} multiple={multiple} onClose={onClose} onSelect={onSelect} />
    </Modal>
  );
}

function MediaPickerContent({
  titleId,
  multiple,
  onClose,
  onSelect,
}: {
  titleId: string;
  multiple: boolean;
  onClose: () => void;
  onSelect: (refs: string[]) => void;
}) {
  const { t } = useAdminI18n();
  const [selected, setSelected] = useState<string[]>([]);
  const { data: assets } = useQuery((r) => r.media.list(), ["media"]);

  const toggle = (ref: string) => {
    if (!multiple) return onSelect([ref]);
    setSelected((s) => (s.includes(ref) ? s.filter((x) => x !== ref) : [...s, ref]));
  };

  return (
    <div className="flex max-h-[88dvh] flex-col bg-ivory text-espresso">
      <div className="flex items-start justify-between gap-4 border-b border-espresso/10 px-5 py-4 sm:px-6">
        <div>
          <h2 id={titleId} className="font-display text-3xl leading-none">
            {t.admin.mediaField.pickerTitle}
          </h2>
          <p className="mt-1.5 text-[0.78rem] text-muted">{t.admin.mediaField.pickerHint}</p>
        </div>
        <IconButton label={t.admin.common.close} onClick={onClose}>
          <X className="size-5" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {!assets ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton aspect-[4/3]" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {assets.map((asset) => {
              const isSelected = selected.includes(asset.ref);
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => toggle(asset.ref)}
                    aria-pressed={multiple ? isSelected : undefined}
                    className={cn(
                      "group relative block aspect-[4/3] w-full overflow-hidden outline-offset-2",
                      isSelected && "ring-2 ring-espresso ring-offset-2 ring-offset-ivory",
                    )}
                  >
                    <SmartImage src={asset.ref} alt={asset.name} sizes="200px" missingLabel={t.admin.mediaField.missing} />
                    <span className="absolute left-1.5 top-1.5">
                      <SourceTag refValue={asset.ref} />
                    </span>
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center bg-espresso text-ivory">
                        <Check className="size-3.5" strokeWidth={2.5} />
                        <span className="sr-only">{t.admin.mediaField.selected}</span>
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-espresso/70 px-2 py-1 text-left text-[0.66rem] text-ivory opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      {asset.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {multiple && (
        <div className="flex justify-end gap-2 border-t border-espresso/10 px-5 py-4 sm:px-6">
          <Button onClick={onClose}>{t.admin.common.cancel}</Button>
          <Button variant="primary" disabled={!selected.length} onClick={() => onSelect(selected)}>
            <ImagePlus className="size-4" />
            {fmt(t.admin.mediaField.pickerAdd, { n: selected.length })}
          </Button>
        </div>
      )}
    </div>
);
}
