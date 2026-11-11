"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/public/locale-context";
import { buttonClass, Container } from "@/components/public/ui";

/** Localized error boundary for public pages (the header and footer stay usable). */
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLocale();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container className="pb-32 pt-40 lg:pt-52">
      <h1 className="font-display text-[clamp(2.6rem,6vw,4.5rem)] leading-none">{t.errorPage.title}</h1>
      <p className="mt-5 max-w-lg text-muted">{t.errorPage.text}</p>
      <button type="button" onClick={reset} className={`${buttonClass("solid")} mt-10`}>
        {t.errorPage.retry}
      </button>
    </Container>
  );
}
