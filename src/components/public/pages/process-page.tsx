"use client";

import { fmt } from "@/lib/i18n";
import { ContactBand } from "../contact-band";
import { useLocale } from "../locale-context";
import { Container, DemoNote, PageIntro } from "../ui";

export function ProcessPage() {
  const { t } = useLocale();

  return (
    <>
      <PageIntro title={t.process.title} lead={t.process.lead} />
      <Container className="py-16 lg:py-24">
        <ol>
          {t.process.steps.map((step, i) => (
            <li
              key={step.title}
              className="grid gap-4 border-b border-espresso/12 py-10 sm:grid-cols-[7rem_1fr] lg:grid-cols-12 lg:gap-6 lg:py-14"
            >
              <span
                className="font-display text-[4.5rem] leading-[0.8] tabular-nums text-champagne lg:col-span-2 lg:text-[6.5rem]"
                aria-label={fmt(t.process.stepLabel, { n: i + 1 })}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="grid gap-4 lg:col-span-10 lg:grid-cols-10 lg:gap-6">
                <h2 className="font-display text-[clamp(2rem,3.4vw,3.2rem)] leading-[1.02] lg:col-span-5">{step.title}</h2>
                <p className="max-w-[52ch] text-[1rem] leading-relaxed text-espresso/70 lg:col-span-5 lg:pt-2">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-12">
          <DemoNote>{t.process.demoNote}</DemoNote>
        </div>
      </Container>
      <div className="bg-stone">
        <ContactBand title={t.process.ctaTitle} text={t.process.ctaText} />
      </div>
    </>
  );
}
