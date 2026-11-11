"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getRepositories } from "@/lib/repositories";
import { DEFAULT_LOCALE, LOCALES, LOCALE_META } from "@/lib/i18n";

/** "/" opens the default language chosen in Settings (Russian unless changed). */
export function RootRedirect() {
  const router = useRouter();
  useEffect(() => {
    getRepositories()
      .settings.get()
      .then((s) => router.replace(`/${s.defaultLocale}`))
      .catch(() => router.replace(`/${DEFAULT_LOCALE}`));
  }, [router]);

  return (
    <main className="grid min-h-[100svh] place-items-center bg-espresso text-ivory">
      <nav className="flex gap-6 text-sm opacity-0 [animation:fade-in_0.4s_1.2s_forwards]">
        {LOCALES.map((l) => (
          <Link key={l} href={`/${l}`} lang={l}>
            {LOCALE_META[l].native}
          </Link>
        ))}
      </nav>
      <style>{`@keyframes fade-in{to{opacity:.7}}`}</style>
    </main>
  );
}
