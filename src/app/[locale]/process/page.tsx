import type { Metadata } from "next";
import { ProcessPage } from "@/components/public/pages/process-page";
import { isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).meta.process;
  return { title: t.title, description: t.description };
}

export default function Page() {
  return <ProcessPage />;
}
