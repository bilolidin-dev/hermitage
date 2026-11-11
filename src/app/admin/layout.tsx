import type { Metadata } from "next";
import { AdminRoot } from "@/components/admin/admin-shell";
import { MotionProvider } from "@/components/motion-provider";
import { fontVariables } from "../fonts";
import { baseMetadata } from "../shared-metadata";
import "../globals.css";

export { viewport } from "../shared-metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Панель управления (демо) — Hermitage",
  // Demo interface: keep it out of search engines. This is not access control.
  robots: { index: false, follow: false },
};

/** Root layout of the demo admin. `lang` follows the admin language chosen in the sidebar. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVariables} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <MotionProvider>
          <AdminRoot>{children}</AdminRoot>
        </MotionProvider>
      </body>
    </html>
  );
}
