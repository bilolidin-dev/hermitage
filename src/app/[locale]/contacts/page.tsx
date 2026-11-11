import type { Metadata } from "next";
import { ContactsPage } from "@/components/public/pages/contacts-page";
import { isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).meta.contacts;
  return pageMetadata(locale, "contacts", { title: t.title, description: t.description });
}

export default function Page() {
  return <ContactsPage />;
}
