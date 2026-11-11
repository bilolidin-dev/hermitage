import type { Metadata } from "next";
import { MotionProvider } from "@/components/motion-provider";
import { fontVariables } from "../fonts";
import { baseMetadata } from "../shared-metadata";
import "../globals.css";

export { viewport } from "../shared-metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Hermitage — архитектура и дизайн интерьера",
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
