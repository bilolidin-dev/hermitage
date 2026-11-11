import type { Metadata } from "next";
import Link from "next/link";
import { LOCALES, LOCALE_META } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = { title: "404 — Hermitage" };

/**
 * 404 for URLs outside any language (e.g. /foo). The language is unknown
 * here, so the message is shown in all three languages, each in its own block.
 */
export default function GlobalNotFound() {
  return (
    <html lang="ru" className={fontVariables}>
      <body className="bg-ivory text-espresso">
        <main className="mx-auto grid min-h-[100svh] max-w-5xl content-center gap-12 px-4 py-20 sm:px-6">
          <p className="font-display text-[clamp(5rem,18vw,11rem)] leading-none text-champagne" aria-hidden>
            404
          </p>
          <ul className="grid gap-10 sm:grid-cols-3">
            {LOCALES.map((l) => {
              const t = getDictionary(l);
              return (
                <li key={l} lang={l}>
                  <h1 className="font-display text-3xl leading-tight">{t.notFound.title}</h1>
                  <p className="mt-3 text-sm text-muted">{t.notFound.text}</p>
                  <Link href={`/${l}`} className="mt-5 inline-block border-b border-espresso pb-1 text-sm font-semibold">
                    {t.notFound.home} ({LOCALE_META[l].code})
                  </Link>
                </li>
              );
            })}
          </ul>
        </main>
      </body>
    </html>
  );
}
