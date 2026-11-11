"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAdminI18n } from "./admin-context";

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function buttonStyles(variant: Variant = "secondary", size: "sm" | "md" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
    size === "md" ? "min-h-11 px-4 text-[0.82rem]" : "min-h-9 px-3 text-[0.78rem]",
    variant === "primary" && "bg-espresso text-ivory hover:bg-charcoal/85",
    variant === "secondary" && "border border-espresso/20 bg-transparent hover:border-espresso/60",
    variant === "ghost" && "text-espresso/75 hover:bg-espresso/5 hover:text-espresso",
    variant === "danger" && "border border-error/30 text-error hover:border-error hover:bg-error/5",
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }
>(function Button({ variant = "secondary", size = "md", loading, className, children, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles(variant, size), className)}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; pressed?: boolean; size?: "sm" | "md" }
>(function IconButton({ label, children, className, pressed, size = "md", ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      {...props}
      className={cn(
        "grid shrink-0 place-items-center text-espresso/65 transition-colors hover:bg-espresso/6 hover:text-espresso disabled:pointer-events-none disabled:opacity-30",
        size === "sm" ? "size-7 sm:size-8" : "size-9",
        className,
      )}
    >
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export const inputClass =
  "w-full border border-espresso/18 bg-white/70 px-3.5 py-2.5 text-[0.9rem] text-espresso outline-none transition-colors placeholder:text-muted hover:border-espresso/35 focus:border-espresso focus:bg-white aria-[invalid=true]:border-error";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  counter,
  optional,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  htmlFor: string;
  counter?: { value: number; max: number };
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useAdminI18n();
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.8rem] font-semibold text-espresso/85">
          {label}
          {optional && <span className="ml-1.5 font-normal text-muted">({t.admin.common.optional})</span>}
        </label>
        {counter && (
          <span
            className={cn(
              "text-[0.7rem] tabular-nums",
              counter.value > counter.max ? "font-semibold text-error" : "text-muted",
            )}
          >
            {counter.value} / {counter.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-[0.78rem] font-medium text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-[0.75rem] leading-snug text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: unknown) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  id?: string;
  disabled?: boolean;
}) {
  const auto = useId();
  const switchId = id ?? auto;
  return (
    <div className="flex items-start gap-3">
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        aria-describedby={hint ? `${switchId}-hint` : undefined}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 border transition-colors disabled:opacity-40",
          checked ? "border-espresso bg-espresso" : "border-espresso/25 bg-white/60",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-0.5 size-[1.125rem] transition-transform duration-300 ease-[var(--ease-out-expo)]",
            checked ? "translate-x-[1.3rem] bg-ivory" : "translate-x-0.5 bg-espresso/55",
          )}
        />
      </button>
      <div>
        <label htmlFor={switchId} className="text-[0.85rem] font-semibold">
          {label}
        </label>
        {hint && (
          <p id={`${switchId}-hint`} className="mt-0.5 text-[0.75rem] leading-snug text-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Language tabs                                                       */
/* ------------------------------------------------------------------ */

export function LangTabs({
  value,
  onChange,
  complete,
  errors,
  idPrefix,
}: {
  value: Locale;
  onChange: (l: Locale) => void;
  complete: Record<Locale, boolean>;
  errors: Record<Locale, boolean>;
  idPrefix: string;
}) {
  const { t } = useAdminI18n();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  return (
    <div role="tablist" aria-label="RU / KY / UZ" className="flex border-b border-espresso/12">
      {LOCALES.map((l, i) => {
        const active = l === value;
        const state = errors[l] ? "error" : complete[l] ? "complete" : "incomplete";
        return (
          <button
            key={l}
            ref={(el) => {
              refs.current[l] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${l}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${l}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(l)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const next = LOCALES[(i + (e.key === "ArrowRight" ? 1 : -1) + LOCALES.length) % LOCALES.length]!;
              onChange(next);
              refs.current[next]?.focus();
            }}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-[0.8rem] font-semibold transition-colors",
              active ? "border-espresso text-espresso" : "border-transparent text-muted hover:text-espresso",
            )}
          >
            <span>{LOCALE_META[l].code}</span>
            <span className="hidden font-normal text-muted sm:inline">{LOCALE_META[l].native}</span>
            <span
              className={cn(
                "size-1.5 rounded-full",
                state === "error" && "bg-error",
                state === "complete" && "bg-success",
                state === "incomplete" && "bg-espresso/20",
              )}
              aria-hidden
            />
            <span className="sr-only">
              {state === "complete" ? t.admin.common.complete : state === "error" ? "!" : t.admin.common.incomplete}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  lead,
  actions,
  eyebrow,
}: {
  title: string;
  lead?: string;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-espresso/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="font-display text-[2.6rem] leading-[0.95] sm:text-5xl">{title}</h1>
        {lead && <p className="mt-3 max-w-2xl text-[0.86rem] leading-relaxed text-muted">{lead}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
  className,
  actions,
  id,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  id?: string;
}) {
  return (
    <section aria-labelledby={title && id ? id : undefined} className={cn("border border-espresso/10 bg-white/55", className)}>
      {title && (
        <div className="flex items-start justify-between gap-4 border-b border-espresso/10 px-5 py-4 sm:px-6">
          <div>
            <h2 id={id} className="text-[0.95rem] font-bold">
              {title}
            </h2>
            {hint && <p className="mt-1 text-[0.78rem] leading-snug text-muted">{hint}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  const { t } = useAdminI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-[0.7rem] font-semibold",
        status === "published" ? "bg-success/10 text-success" : "bg-espresso/6 text-espresso/65",
      )}
    >
      <span className={cn("size-1.5 rounded-full", status === "published" ? "bg-success" : "bg-espresso/40")} aria-hidden />
      {status === "published" ? t.admin.projects.statusPublished : t.admin.projects.statusDraft}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {icon && <div className="mb-5 grid size-14 place-items-center border border-espresso/12 text-champagne">{icon}</div>}
      <p className="font-display text-3xl">{title}</p>
      {text && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  const { t } = useAdminI18n();
  return (
    <div className="space-y-3" aria-busy aria-label={t.admin.common.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-16" />
      ))}
    </div>
  );
}

export function ErrorBlock({ onRetry }: { onRetry?: () => void }) {
  const { t } = useAdminI18n();
  return (
    <div className="border border-error/25 bg-error/5 p-5 text-sm text-error">
      <p>{t.admin.common.loadError}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">
          {t.admin.common.retry}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Action menu                                                         */
/* ------------------------------------------------------------------ */

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  tone?: "danger";
  hidden?: boolean;
}

export function ActionMenu({ items, label }: { items: MenuItem[]; label?: string }) {
  const { t } = useAdminI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = items.filter((i) => !i.hidden);
  return (
    <div ref={ref} className="relative">
      <IconButton
        ref={buttonRef}
        label={label ?? t.admin.common.more}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "ArrowDown" && setOpen(true)}
      >
        <MoreHorizontal className="size-4.5" strokeWidth={1.5} />
      </IconButton>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-[14rem] border border-espresso/12 bg-ivory py-1.5 shadow-[0_18px_40px_-20px_rgb(33_29_28/0.45)]"
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const nodes = [...(ref.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
            const i = nodes.indexOf(document.activeElement as HTMLButtonElement);
            nodes[(i + (e.key === "ArrowDown" ? 1 : -1) + nodes.length) % nodes.length]?.focus();
          }}
        >
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[0.82rem] transition-colors hover:bg-espresso/5 focus:bg-espresso/5 focus:outline-none",
                item.tone === "danger" ? "text-error" : "text-espresso",
              )}
            >
              <span className="text-current opacity-70">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function useLocaleRecord<T>(fn: (l: Locale) => T): Record<Locale, T> {
  return { ru: fn("ru"), ky: fn("ky"), uz: fn("uz") };
}
