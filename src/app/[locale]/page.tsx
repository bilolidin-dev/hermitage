import { HomePage } from "@/components/public/pages/home-page";
import { isLocale, LOCALES } from "@/lib/i18n";
import { seedSettings } from "@/lib/seed/settings";
import { siteUrl } from "@/lib/seo";

/**
 * schema.org description of the studio for search engines. Only facts given
 * in the brief are used (name, WhatsApp, Instagram, cities); no street
 * address is published because none was provided.
 */
function studioJsonLd(locale: string) {
  const s = seedSettings();
  const base = siteUrl();
  const lang = isLocale(locale) ? locale : "ru";
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": new URL("/#studio", base).href,
    name: s.studioName,
    url: new URL(`/${lang}`, base).href,
    description: s.seo.description[lang],
    image: new URL(`/${lang}/opengraph-image`, base).href,
    telephone: s.whatsapp,
    sameAs: [s.instagram],
    areaServed: s.cities.map((c) => ({ "@type": "City", name: c.name[lang] })),
    knowsLanguage: [...LOCALES],
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // "<" is escaped so the JSON can never close the script element.
  const json = JSON.stringify(studioJsonLd(locale)).replace(/</g, "\\u003c");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      <HomePage />
    </>
  );
}
