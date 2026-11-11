"use client";

import { SmartImage } from "@/components/shared/smart-image";
import { demo } from "@/lib/seed/demo-media";
import { ContactBand } from "../contact-band";
import { useLocale } from "../locale-context";
import { ImageReveal } from "../reveal";
import { Container, DemoNote, PageIntro } from "../ui";

export function AboutPage() {
  const { t } = useLocale();

  return (
    <>
      <PageIntro title={t.about.title} />

      <Container className="grid gap-12 py-20 lg:grid-cols-12 lg:gap-6 lg:py-32">
        <div className="lg:col-span-6">
          <p className="font-display text-[clamp(2rem,3.8vw,3.6rem)] leading-[1.08] text-balance-pretty">
            {t.about.statement}
          </p>
          <div className="mt-12 space-y-5 text-[1rem] leading-[1.75] text-espresso/75 lg:ml-[16%]">
            {t.about.text.map((p, i) => (
              <p key={i} className="max-w-[56ch]">
                {p}
              </p>
            ))}
          </div>
        </div>
        <figure className="lg:col-span-5 lg:col-start-8">
          <ImageReveal className="relative aspect-[3/4] overflow-hidden">
            <SmartImage src={demo("living-light")} alt="" sizes="(min-width: 1024px) 40vw, 100vw" />
          </ImageReveal>
          <figcaption className="mt-4">
            <DemoNote>{t.about.photoNote}</DemoNote>
          </figcaption>
        </figure>
      </Container>

      <section aria-labelledby="principles-title" className="bg-espresso py-24 text-ivory lg:py-36">
        <Container>
          <h2 id="principles-title" className="font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-none">
            {t.about.principlesTitle}
          </h2>
          <div className="mt-14 grid gap-px bg-ivory/12 sm:grid-cols-2 lg:mt-20">
            {t.about.principles.map((p) => (
              <div key={p.title} className="bg-espresso p-6 pb-12 sm:p-10 lg:p-14">
                <h3 className="font-display text-[clamp(2.4rem,4vw,3.6rem)] leading-none text-champagne">{p.title}</h3>
                <p className="mt-6 max-w-[40ch] text-[0.95rem] leading-relaxed text-ivory/70">{p.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <DemoNote tone="light">{t.about.demoNote}</DemoNote>
          </div>
        </Container>
      </section>

      <ContactBand />
    </>
  );
}
