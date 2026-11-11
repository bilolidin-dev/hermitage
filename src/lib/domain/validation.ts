import { LOCALES } from "@/lib/i18n/config";
import type { LocalizedText, ProjectInput, ServiceInput, SettingsInput } from "./types";

/**
 * Validation is framework-free so it can run in forms, in the mock
 * repositories, and later in a server function (e.g. a Firebase trigger).
 * Messages are codes; the UI translates them.
 */
export type ValidationCode =
  | "required"
  | "translationRequired"
  | "slugFormat"
  | "slugTaken"
  | "yearRange"
  | "areaRange"
  | "coverRequired"
  | "tooLong"
  | "phoneFormat"
  | "instagramFormat"
  | "coordinates";

export interface ValidationIssue {
  /** Dot path, e.g. "title.ky" or "cities.0.name.ru" */
  path: string;
  code: ValidationCode;
  /** Optional numeric parameter, e.g. a max length. */
  max?: number;
}

export const LIMITS = {
  title: 90,
  location: 80,
  description: 4000,
  serviceTitle: 80,
  serviceDescription: 600,
  seoTitle: 70,
  seoDescription: 170,
  studioName: 60,
  cityNote: 160,
} as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MIN_YEAR = 1990;
export const maxYear = () => new Date().getFullYear() + 5;

type Requirement = "all" | "ru" | "none";

function checkLocalized(
  issues: ValidationIssue[],
  field: string,
  text: LocalizedText,
  opts: { required: Requirement; max: number },
) {
  for (const l of LOCALES) {
    const value = text[l].trim();
    const needed = opts.required === "all" || (opts.required === "ru" && l === "ru");
    if (value.length > opts.max) {
      issues.push({ path: `${field}.${l}`, code: "tooLong", max: opts.max });
    } else if (!value && needed) {
      issues.push({ path: `${field}.${l}`, code: l === "ru" ? "required" : "translationRequired" });
    }
  }
}

/**
 * Drafts only need the essentials. Publishing requires complete content in
 * all three languages and a cover, so the public site never mixes languages.
 */
export function validateProject(input: ProjectInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const publishing = input.status === "published";

  checkLocalized(issues, "title", input.title, { required: publishing ? "all" : "ru", max: LIMITS.title });
  checkLocalized(issues, "location", input.location, { required: publishing ? "all" : "none", max: LIMITS.location });
  checkLocalized(issues, "description", input.description, {
    required: publishing ? "all" : "none",
    max: LIMITS.description,
  });

  if (!input.slug.trim()) issues.push({ path: "slug", code: "required" });
  else if (!SLUG_PATTERN.test(input.slug)) issues.push({ path: "slug", code: "slugFormat" });

  if (!Number.isInteger(input.year) || input.year < MIN_YEAR || input.year > maxYear()) {
    issues.push({ path: "year", code: "yearRange" });
  }
  if (input.area !== null && (!Number.isFinite(input.area) || input.area <= 0 || input.area > 100000)) {
    issues.push({ path: "area", code: "areaRange" });
  }
  if (publishing && !input.cover) issues.push({ path: "cover", code: "coverRequired" });

  return issues;
}

/** Visible services need all languages; hidden ones only a Russian title. */
export function validateService(input: ServiceInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkLocalized(issues, "title", input.title, { required: input.visible ? "all" : "ru", max: LIMITS.serviceTitle });
  checkLocalized(issues, "description", input.description, {
    required: input.visible ? "all" : "none",
    max: LIMITS.serviceDescription,
  });
  return issues;
}

export const PHONE_PATTERN = /^\+\d{9,15}$/;
export const INSTAGRAM_PATTERN = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/;

export function normalizePhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function validateSettings(input: SettingsInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const name = input.studioName.trim();
  if (!name) issues.push({ path: "studioName", code: "required" });
  else if (name.length > LIMITS.studioName) issues.push({ path: "studioName", code: "tooLong", max: LIMITS.studioName });

  if (!PHONE_PATTERN.test(normalizePhone(input.whatsapp))) issues.push({ path: "whatsapp", code: "phoneFormat" });
  if (!INSTAGRAM_PATTERN.test(input.instagram.trim())) issues.push({ path: "instagram", code: "instagramFormat" });

  input.cities.forEach((city, i) => {
    checkLocalized(issues, `cities.${i}.name`, city.name, { required: "all", max: 60 });
    checkLocalized(issues, `cities.${i}.note`, city.note, { required: "none", max: LIMITS.cityNote });
    if (
      !Number.isFinite(city.latitude) ||
      !Number.isFinite(city.longitude) ||
      Math.abs(city.latitude) > 90 ||
      Math.abs(city.longitude) > 180
    ) {
      issues.push({ path: `cities.${i}.coordinates`, code: "coordinates" });
    }
  });

  checkLocalized(issues, "seo.title", input.seo.title, { required: "all", max: LIMITS.seoTitle });
  checkLocalized(issues, "seo.description", input.seo.description, { required: "all", max: LIMITS.seoDescription });
  return issues;
}

/* ------------------------------------------------------------------ */
/* Slugs                                                               */
/* ------------------------------------------------------------------ */

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  // Kyrgyz
  ң: "ng", ө: "o", ү: "u",
  // Uzbek Cyrillic letters, in case they are typed
  ў: "o", қ: "q", ғ: "g", ҳ: "h",
  // Symbols that Unicode would otherwise expand into letters ("№" → "No")
  "№": "",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ʻʼ‘’'`]/g, "")
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritics
    // Compatibility decomposition can produce capitals (e.g. "Ⅻ" → "XII"), so lowercase again.
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
