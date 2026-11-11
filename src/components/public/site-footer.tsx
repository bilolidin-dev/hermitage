"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { useSettings } from "@/hooks/use-data";
import { localized } from "@/lib/domain/types";
import { formatCoordinate, localePath } from "@/lib/i18n";
import { formatPhone, instagramHandle, whatsappLink } from "@/lib/utils";
import { useLocale } from "./locale-context";
import { LocaleSwitcher, useNavItems } from "./site-header";

export function SiteFooter() {
  const { locale, t } = useLocale();
  const items = useNavItems();
  const { data: settings } = useSettings();

  return (
    <footer className="bg-espresso text-ivory">
      <div className="mx-auto max-w-[1680px] px-4 pb-10 pt-20 sm:px-6 lg:px-10 lg:pt-28">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href={localePath(locale)} aria-label={settings?.studioName ?? "Hermitage"}>
              <Logo name={settings?.studioName} logo={settings?.logo} size="lg" />
            </Link>
            <p className="mt-6 max-w-sm text-sm text-ivory/60">{t.footer.tagline}</p>
          </div>

          <nav aria-label={t.footer.navigation} className="lg:col-span-2">
            <h2 className="text-xs text-muted-inverse">{t.footer.navigation}</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {items.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="transition-colors hover:text-champagne">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="text-xs text-muted-inverse">{t.footer.contacts}</h2>
            {settings ? (
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <a
                    href={whatsappLink(settings.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-champagne"
                  >
                    WhatsApp {formatPhone(settings.whatsapp)}
                  </a>
                </li>
                <li>
                  <a
                    href={settings.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-champagne"
                  >
                    Instagram {instagramHandle(settings.instagram)}
                  </a>
                </li>
              </ul>
            ) : (
              <div className="mt-5 h-12" aria-hidden />
            )}
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-xs text-muted-inverse">{t.footer.cities}</h2>
            <ul className="mt-5 space-y-4 text-sm">
              {settings?.cities.map((city) => (
                <li key={city.id}>
                  <span className="font-display-text text-2xl">{localized(city.name, locale)}</span>
                  <span className="mt-1 block text-[0.7rem] tabular-nums text-muted-inverse">
                    {formatCoordinate(city.latitude, "lat")} {formatCoordinate(city.longitude, "lon")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-6 border-t border-ivory/15 pt-8 text-xs text-muted-inverse lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-2xl">{t.footer.demo}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <LocaleSwitcher tone="light" className="-ml-1.5" />
            <Link href="/admin" className="underline-offset-4 hover:text-ivory hover:underline">
              {t.footer.admin}
            </Link>
            <span>© {new Date().getFullYear()} {settings?.studioName ?? t.footer.rights}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
