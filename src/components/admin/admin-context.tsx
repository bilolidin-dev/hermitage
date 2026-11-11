"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/shared/modal";
import { usePreferences } from "@/hooks/use-data";
import { maxYear, MIN_YEAR, type ValidationIssue } from "@/lib/domain/validation";
import { fmt, type Dictionary, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { errorCode } from "@/lib/repositories";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Admin language                                                      */
/* ------------------------------------------------------------------ */

interface AdminI18n {
  locale: Locale;
  t: Dictionary;
  setLocale: (l: Locale) => void;
  /** Translate a validation issue or an encoded RHF message ("code|max"). */
  issue: (issue: ValidationIssue | string | undefined) => string | undefined;
  /** Translate any thrown error into a sentence. */
  error: (e: unknown) => string;
}

const I18nContext = createContext<AdminI18n | null>(null);

export function encodeIssue(i: ValidationIssue): string {
  return `${i.code}|${i.max ?? ""}`;
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

interface ToastInput {
  message: string;
  tone?: "success" | "error";
  action?: { label: string; href?: string; onClick?: () => void };
}
interface ToastItem extends ToastInput {
  id: number;
}
type ToastFn = (t: ToastInput) => void;
const ToastContext = createContext<ToastFn | null>(null);

/* ------------------------------------------------------------------ */
/* Confirm dialog                                                      */
/* ------------------------------------------------------------------ */

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

/* ------------------------------------------------------------------ */
/* Unsaved changes guard                                               */
/* ------------------------------------------------------------------ */

interface GuardContextValue {
  setDirty: (dirty: boolean) => void;
  isDirty: () => boolean;
  /** Runs `action` immediately, or after the user confirms leaving unsaved changes. */
  guard: (action: () => void) => void;
}
const GuardContext = createContext<GuardContextValue | null>(null);

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = usePreferences();
  const locale = prefs.adminLocale;
  const t = getDictionary(locale);

  const i18n = useMemo<AdminI18n>(() => {
    const issue = (value: ValidationIssue | string | undefined) => {
      if (!value) return undefined;
      const [code, max] = typeof value === "string" ? value.split("|") : [value.code, value.max];
      const template = t.validation[code as keyof Dictionary["validation"]];
      if (!template) return String(code);
      return fmt(template, { max: max ?? "", min: MIN_YEAR, ...(code === "yearRange" ? { max: maxYear() } : {}) });
    };
    return {
      locale,
      t,
      setLocale: (l) => setPrefs({ adminLocale: l }),
      issue,
      error: (e) => t.errors[errorCode(e)],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  /* toasts */
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((x) => x.id !== id)), []);
  const toast = useCallback<ToastFn>(
    (input) => {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-3), { ...input, id }]);
      window.setTimeout(() => dismiss(id), input.action ? 8000 : 4200);
    },
    [dismiss],
  );

  /* confirm */
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve })),
    [],
  );
  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  /* guard */
  const dirtyRef = useRef(false);
  const guardValue = useMemo<GuardContextValue>(
    () => ({
      setDirty: (d) => {
        dirtyRef.current = d;
      },
      isDirty: () => dirtyRef.current,
      guard: (action) => {
        if (!dirtyRef.current) return action();
        void confirm({
          title: t.admin.common.unsavedTitle,
          text: t.admin.common.unsavedText,
          confirmLabel: t.admin.common.unsavedLeave,
          cancelLabel: t.admin.common.unsavedStay,
          tone: "danger",
        }).then((ok) => {
          if (ok) {
            dirtyRef.current = false;
            action();
          }
        });
      },
    }),
    [confirm, t],
  );

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <I18nContext.Provider value={i18n}>
      <ToastContext.Provider value={toast}>
        <ConfirmContext.Provider value={confirm}>
          <GuardContext.Provider value={guardValue}>
            {children}

            <Modal open={!!confirmState} onClose={() => closeConfirm(false)} labelledBy="confirm-title">
              {confirmState && (
                <div className="bg-ivory p-6 text-espresso sm:p-8">
                  <h2 id="confirm-title" className="font-display text-[1.9rem] leading-tight">
                    {confirmState.title}
                  </h2>
                  {confirmState.text && <p className="mt-3 text-sm leading-relaxed text-espresso/70">{confirmState.text}</p>}
                  <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => closeConfirm(false)}
                      className="min-h-11 border border-espresso/20 px-5 text-sm font-semibold hover:border-espresso"
                      autoFocus
                    >
                      {confirmState.cancelLabel ?? t.admin.common.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => closeConfirm(true)}
                      className={cn(
                        "min-h-11 px-5 text-sm font-semibold text-ivory",
                        confirmState.tone === "danger" ? "bg-error hover:bg-error/90" : "bg-espresso hover:bg-charcoal",
                      )}
                    >
                      {confirmState.confirmLabel}
                    </button>
                  </div>
                </div>
              )}
            </Modal>

            <div
              className="pointer-events-none fixed inset-x-3 bottom-3 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
              aria-live="polite"
              role="status"
            >
              <AnimatePresence initial={false}>
                {toasts.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "pointer-events-auto flex w-full max-w-sm items-start gap-3 border-l-2 bg-espresso px-4 py-3.5 text-sm text-ivory shadow-[0_10px_30px_-12px_rgb(33_29_28/0.5)]",
                      item.tone === "error" ? "border-error" : "border-champagne",
                    )}
                  >
                    {item.tone === "error" ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#e3a597]" strokeWidth={1.5} aria-hidden />
                    ) : (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-champagne" strokeWidth={1.5} aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug">{item.message}</p>
                      {item.action &&
                        (item.action.href ? (
                          <Link
                            href={item.action.href}
                            onClick={() => dismiss(item.id)}
                            className="mt-1.5 inline-block font-semibold text-champagne underline-offset-4 hover:underline"
                          >
                            {item.action.label}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              item.action?.onClick?.();
                              dismiss(item.id);
                            }}
                            className="mt-1.5 font-semibold text-champagne underline-offset-4 hover:underline"
                          >
                            {item.action.label}
                          </button>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      className="-mr-1 p-1 text-muted-inverse hover:text-ivory"
                      aria-label={t.admin.common.close}
                    >
                      <X className="size-4" strokeWidth={1.5} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </GuardContext.Provider>
        </ConfirmContext.Provider>
      </ToastContext.Provider>
    </I18nContext.Provider>
  );
}

export function useAdminI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useAdminI18n outside AdminProviders");
  return ctx;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast outside AdminProviders");
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm outside AdminProviders");
  return ctx;
}

export function useGuard() {
  const ctx = useContext(GuardContext);
  if (!ctx) throw new Error("useGuard outside AdminProviders");
  return ctx;
}

/** Register a form's dirty state with the navigation guard. */
export function useUnsavedChanges(dirty: boolean) {
  const { setDirty } = useGuard();
  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);
}

/** Navigation that asks before discarding unsaved changes. */
export function useGuardedRouter() {
  const router = useRouter();
  const { guard } = useGuard();
  return {
    push: (href: string) => guard(() => router.push(href)),
    replace: (href: string) => guard(() => router.replace(href)),
  };
}

export function GuardedLink({
  href,
  onClick,
  ...props
}: React.ComponentProps<typeof Link> & { href: string }) {
  const { guard, isDirty } = useGuard();
  const router = useRouter();
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || props.target === "_blank") return;
        if (isDirty()) {
          e.preventDefault();
          guard(() => router.push(href));
        }
      }}
    />
  );
}
