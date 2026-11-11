"use client";

import { useSettings } from "@/hooks/use-data";
import { localized } from "@/lib/domain/types";
import { formatCoordinate } from "@/lib/i18n";
import { formatPhone, instagramHandle, whatsappLink } from "@/lib/utils";
import { useLocale } from "./locale-context";
import { buttonClass, Container, LineLink } from "./ui";

/** Closing call to action shared by several pages. */
export function ContactBand({ title, text }: { title?: string; text?: string }) {
  const { locale, t } = useLocale();
  const { data: settings } = useSettings();

  return (
    <section aria-labelledby="contact-band-title" className="py-28 lg:py-40">
      <Container className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 id="contact-band-title" className="font-display text-[clamp(2.6rem,6vw,6rem)] leading-[0.95]">
            {title ?? t.home.ctaTitle}
          </h2>
          <p className="mt-8 max-w-[44ch] text-[0.98rem] leading-relaxed text-espresso/70">{text ?? t.home.ctaText}</p>
          {settings && (
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
              <a href={whatsappLink(settings.whatsapp)} target="_blank" rel="noreferrer" className={buttonClass("solid")}>
                {t.common.writeWhatsApp}
              </a>
              <LineLink href={settings.instagram} external>
                Instagram {instagramHandle(settings.instagram)}
              </LineLink>
            </div>
          )}
          {settings && <p className="mt-6 text-sm tabular-nums text-muted">{formatPhone(settings.whatsapp)}</p>}
        </div>
        <div className="lg:col-span-4 lg:col-start-9">
          <h3 className="text-xs text-muted">{t.home.citiesTitle}</h3>
          <ul className="mt-4 border-b border-espresso/12">
            {settings?.cities.map((city) => (
              <li key={city.id} className="border-t border-espresso/12 py-6">
                <p className="font-display text-4xl">{localized(city.name, locale)}</p>
                <p className="mt-2 text-xs tabular-nums text-muted">
                  {formatCoordinate(city.latitude, "lat")}, {formatCoordinate(city.longitude, "lon")}
                </p>
                {localized(city.note, locale) && (
                  <p className="mt-3 text-sm text-espresso/70">{localized(city.note, locale)}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
