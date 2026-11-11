import { LOCALE_META, type Locale } from "./config";

export interface Plural {
  one: string;
  few?: string;
  many?: string;
  other: string;
}

export const pl = (forms: Plural): Plural => forms;

/** Replace {name} placeholders. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in vars ? String(vars[key]) : `{${key}}`));
}

export function plural(locale: Locale, n: number, forms: Plural, vars: Record<string, string | number> = {}): string {
  const rule = new Intl.PluralRules(LOCALE_META[locale].intl).select(n) as keyof Plural;
  const template = forms[rule] ?? forms.other;
  return fmt(template, { n, ...vars });
}

export function formatDate(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(LOCALE_META[locale].intl, { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatDateTime(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function relativeTime(locale: Locale, iso: string, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(LOCALE_META[locale].intl, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 45) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(locale, iso);
}

export function formatNumber(locale: Locale, n: number): string {
  return new Intl.NumberFormat(LOCALE_META[locale].intl).format(n);
}

export function formatBytes(locale: Locale, bytes: number): string {
  const mb = bytes / (1024 * 1024);
  const nf = new Intl.NumberFormat(LOCALE_META[locale].intl, { maximumFractionDigits: 1 });
  return mb >= 1 ? `${nf.format(mb)} MB` : `${nf.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

export function formatCoordinate(value: number, axis: "lat" | "lon"): string {
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}° ${hemi}`;
}
