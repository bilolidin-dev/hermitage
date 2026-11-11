import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MotionProvider } from "@/components/motion-provider";
import { LocaleProvider } from "@/components/public/locale-context";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { SiteIntro } from "@/components/public/site-intro";
import { isLocale, LOCALES } from "@/lib/i18n";
import { getPublicDictionary } from "@/lib/i18n/dictionaries";
import { seedSettings } from "@/lib/seed/settings";
import { fontVariables } from "../fonts";
import { baseMetadata } from "../shared-metadata";
import "../globals.css";

export { viewport } from "../shared-metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  // Server-rendered defaults; the client applies SEO text edited in the admin panel.
  const seo = seedSettings().seo;
  return {
    ...baseMetadata,
    title: { absolute: seo.title[locale], template: "%s — Hermitage" },
    description: seo.description[locale],
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
    openGraph: { locale, siteName: "Hermitage Interior Design", type: "website" },
  };
}

/**
 * Root layout of the public site. Being a root layout lets the server render
 * the correct <html lang> for /ru, /ky and /uz.
 */
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    // suppressHydrationWarning: the intro script may add data-intro to <html> before hydration.
    <html lang={locale} className={fontVariables} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <SiteIntro />
        <MotionProvider>
          <LocaleProvider locale={locale} t={getPublicDictionary(locale)}>
            <SiteHeader />
            <main id="content" className="min-h-[70vh]">
              {children}
            </main>
            <SiteFooter />
          </LocaleProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
