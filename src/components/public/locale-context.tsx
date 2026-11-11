"use client";

import { createContext, useContext } from "react";
import type { Locale, PublicDictionary } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  t: PublicDictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Provides the active language and its public strings. The dictionary is
 * passed in (from the server layout, or from the admin preview) rather than
 * imported here, which keeps translations out of the public JS bundle.
 */
export function LocaleProvider({
  locale,
  t,
  children,
}: {
  locale: Locale;
  t: PublicDictionary;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={{ locale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
