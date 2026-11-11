"use client";

import { useLocale } from "@/components/public/locale-context";
import { Container, LineLink } from "@/components/public/ui";
import { localePath } from "@/lib/i18n";

export default function LocaleNotFound() {
  const { locale, t } = useLocale();
  return (
    <Container className="pb-32 pt-40 lg:pt-52">
      <p className="font-display text-[clamp(5rem,18vw,12rem)] leading-none text-champagne" aria-hidden>
        404
      </p>
      <h1 className="mt-4 font-display text-[clamp(2.6rem,6vw,4.5rem)] leading-none">{t.notFound.title}</h1>
      <p className="mt-5 max-w-md text-muted">{t.notFound.text}</p>
      <div className="mt-10 flex flex-wrap gap-8">
        <LineLink href={localePath(locale)}>{t.notFound.home}</LineLink>
        <LineLink href={localePath(locale, "projects")}>{t.common.allProjects}</LineLink>
      </div>
    </Container>
  );
}
