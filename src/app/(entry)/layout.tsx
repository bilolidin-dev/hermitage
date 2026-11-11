import type { Metadata } from "next";
import { MotionProvider } from "@/components/motion-provider";
import { fontVariables } from "../fonts";
import { languageAlternates, siteUrl } from "@/lib/seo";
import { baseMetadata } from "../shared-metadata";
import "../globals.css";

export { viewport } from "../shared-metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Hermitage — архитектура и дизайн интерьера",
  metadataBase: siteUrl(),
  // "/" only redirects; the Russian home page is the canonical version.
  alternates: { canonical: "/ru", languages: languageAlternates("") },
};

/** Root layout for "/" only: it redirects to the default language. */
export default function EntryLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVariables} data-scroll-behavior="smooth">
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
