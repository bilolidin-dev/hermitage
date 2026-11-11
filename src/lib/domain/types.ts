import { z } from "zod";
import { LOCALES, type Locale } from "@/lib/i18n/config";

/* ------------------------------------------------------------------ */
/* Localized text                                                      */
/* ------------------------------------------------------------------ */

export const localizedTextSchema = z.object({
  ru: z.string(),
  ky: z.string(),
  uz: z.string(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const emptyLocalized = (): LocalizedText => ({ ru: "", ky: "", uz: "" });

export function localized(text: LocalizedText | undefined, locale: Locale): string {
  return text?.[locale]?.trim() ?? "";
}

export function isLocalizedComplete(text: LocalizedText): boolean {
  return LOCALES.every((l) => text[l].trim().length > 0);
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export const CATEGORY_IDS = ["residential", "house", "commercial", "hospitality"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const PROJECT_STATUSES = ["draft", "published"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Image references are plain strings:
 *  - "/demo/house-dusk.jpg"  static demo image shipped with the site
 *  - "local:<id>"            image stored only in this browser (IndexedDB)
 *  - "https://…"             a future cloud URL (e.g. Firebase Storage)
 */
export type MediaRef = string;

export const projectSchema = z.object({
  id: z.string().min(1),
  slug: z.string(),
  category: z.enum(CATEGORY_IDS),
  title: localizedTextSchema,
  location: localizedTextSchema,
  description: localizedTextSchema,
  year: z.number().int(),
  area: z.number().nullable(),
  cover: z.string().nullable(),
  gallery: z.array(z.string()),
  featured: z.boolean(),
  status: z.enum(PROJECT_STATUSES),
  order: z.number(),
  isDemo: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
});
export type Project = z.infer<typeof projectSchema>;

/** Fields an editor can change. System fields are managed by the repository. */
export type ProjectInput = Pick<
  Project,
  | "slug"
  | "category"
  | "title"
  | "location"
  | "description"
  | "year"
  | "area"
  | "cover"
  | "gallery"
  | "featured"
  | "status"
>;

export function toProjectInput(p: Project): ProjectInput {
  return {
    slug: p.slug,
    category: p.category,
    title: { ...p.title },
    location: { ...p.location },
    description: { ...p.description },
    year: p.year,
    area: p.area,
    cover: p.cover,
    gallery: [...p.gallery],
    featured: p.featured,
    status: p.status,
  };
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export const serviceSchema = z.object({
  id: z.string().min(1),
  title: localizedTextSchema,
  description: localizedTextSchema,
  visible: z.boolean(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Service = z.infer<typeof serviceSchema>;
export type ServiceInput = Pick<Service, "title" | "description" | "visible">;

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const citySchema = z.object({
  id: z.string().min(1),
  name: localizedTextSchema,
  note: localizedTextSchema,
  latitude: z.number(),
  longitude: z.number(),
});
export type City = z.infer<typeof citySchema>;

export const settingsSchema = z.object({
  studioName: z.string(),
  logo: z.string().nullable(),
  whatsapp: z.string(),
  instagram: z.string(),
  cities: z.array(citySchema),
  defaultLocale: z.enum(LOCALES),
  seo: z.object({
    title: localizedTextSchema,
    description: localizedTextSchema,
  }),
  updatedAt: z.string(),
});
export type Settings = z.infer<typeof settingsSchema>;
export type SettingsInput = Omit<Settings, "updatedAt">;

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export type MediaSource = "demo" | "local";

export interface MediaAsset {
  id: string;
  ref: MediaRef;
  name: string;
  type: string;
  size: number | null;
  width: number | null;
  height: number | null;
  source: MediaSource;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Activity log                                                        */
/* ------------------------------------------------------------------ */

export const ACTIVITY_ACTIONS = [
  "project.created",
  "project.updated",
  "project.deleted",
  "project.duplicated",
  "project.published",
  "project.unpublished",
  "project.featured",
  "project.unfeatured",
  "project.reordered",
  "service.created",
  "service.updated",
  "service.deleted",
  "service.reordered",
  "settings.updated",
  "media.uploaded",
  "media.deleted",
  "demo.reset",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const activitySchema = z.object({
  id: z.string(),
  action: z.enum(ACTIVITY_ACTIONS),
  entityId: z.string().nullable(),
  /** Snapshot of the entity name at the time of the action. */
  label: localizedTextSchema.nullable(),
  at: z.string(),
});
export type ActivityEntry = z.infer<typeof activitySchema>;
