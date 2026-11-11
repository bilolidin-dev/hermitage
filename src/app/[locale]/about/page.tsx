import type { Metadata } from "next";
import { AboutPage } from "@/components/public/pages/about-page";
import { isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).meta.about;
  return { title: t.title, description: t.description };
}

export default function Page() {
  return <AboutPage />;
}
