export const LOCALES = ["ru", "ky", "uz"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ru";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Language names are always shown in their own language. */
export const LOCALE_META: Record<Locale, { code: string; native: string; intl: string }> = {
  ru: { code: "RU", native: "Русский", intl: "ru-RU" },
  ky: { code: "KY", native: "Кыргызча", intl: "ky-KG" },
  uz: { code: "UZ", native: "Oʻzbekcha", intl: "uz-Latn-UZ" },
};

/** Build a public URL that keeps the current language. */
export function localePath(locale: Locale, path = ""): string {
  const clean = path.replace(/^\/+/, "");
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}

/** Replace the locale segment of a public pathname. */
export function switchLocalePath(pathname: string, next: Locale): string {
  const parts = pathname.split("/");
  if (parts.length > 1 && isLocale(parts[1])) {
    parts[1] = next;
    return parts.join("/") || `/${next}`;
  }
  return `/${next}`;
}
