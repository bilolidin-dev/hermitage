import type { Metadata } from "next";
import { LOCALES, type Locale } from "@/lib/i18n";

/**
 * Absolute site URL used for canonical links, hreflang, Open Graph and the
 * sitemap. Set NEXT_PUBLIC_SITE_URL to the real domain in production
 * (e.g. https://example.com). On Vercel the production domain is used
 * automatically; locally it falls back to http://localhost:3000.
 */
export function siteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000";
  return new URL(raw);
}

export const OG_LOCALE: Record<Locale, string> = { ru: "ru_RU", ky: "ky_KG", uz: "uz_UZ" };

export const SITE_NAME = "Hermitage Interior Design";

/** Public page paths (relative to /{locale}) that are listed in the sitemap. */
export const PUBLIC_PATHS = ["", "projects", "services", "about", "process", "contacts"] as const;

const join = (locale: Locale, path: string) => (path ? `/${locale}/${path}` : `/${locale}`);

/** hreflang map for one page: every language plus x-default (Russian). */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(LOCALES.map((l) => [l, join(l, path)])),
    "x-default": join("ru", path),
  };
}

/**
 * Per-page metadata: canonical URL, hreflang alternates, Open Graph and
 * Twitter card. The Open Graph image comes from `[locale]/opengraph-image`.
 */
export function pageMetadata(
  locale: Locale,
  path: string,
  { title, description, type = "website" }: { title?: string; description: string; type?: "website" | "article" },
): Metadata {
  const url = join(locale, path);
  // The "%s — Hermitage" template only applies to <title>; social titles get the suffix here.
  const social = title ? `${title} — Hermitage` : undefined;
  // A page's own openGraph object replaces the inherited one, so the image is set explicitly.
  const image = { url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME };
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      ...(social ? { title: social } : {}),
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", ...(social ? { title: social } : {}), description, images: [image.url] },
  };
}
