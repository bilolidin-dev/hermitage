"use client";

import { useVisibleServices } from "@/hooks/use-data";
import { localized } from "@/lib/domain/types";
import { ContactBand } from "../contact-band";
import { useLocale } from "../locale-context";
import { Container, DemoNote, PageIntro } from "../ui";

export function ServicesPage() {
  const { locale, t } = useLocale();
  const { data: services, error } = useVisibleServices();

  return (
    <>
      <PageIntro title={t.services.title} lead={t.services.lead} />
      <Container className="py-16 lg:py-24">
        {error ? <p className="text-espresso/70">{t.common.loadError}</p> : null}
        {!services && !error ? (
          <div className="space-y-6" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-28" />
            ))}
          </div>
        ) : null}
        {services?.length === 0 && <p className="text-espresso/70">{t.services.empty}</p>}
        <ul>
          {services?.map((s) => (
            <li
              key={s.id}
              className="group grid gap-4 border-b border-espresso/12 py-10 first:pt-0 lg:grid-cols-12 lg:gap-6 lg:py-14"
            >
              <h2 className="font-display text-[clamp(2.1rem,4.4vw,4rem)] leading-[1] transition-transform duration-700 ease-[var(--ease-out-expo)] lg:col-span-6 lg:group-hover:translate-x-3">
                {localized(s.title, locale)}
              </h2>
              <p className="max-w-[52ch] text-[1rem] leading-relaxed text-espresso/70 lg:col-span-5 lg:col-start-8 lg:pt-3">
                {localized(s.description, locale)}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-12">
          <DemoNote>{t.services.demoNote}</DemoNote>
        </div>
      </Container>
      <div className="bg-stone">
        <ContactBand title={t.services.ctaTitle} text={t.services.ctaText} />
      </div>
    </>
  );
}
