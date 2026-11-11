import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { seedSettings } from "@/lib/seed/settings";

/**
 * Link-preview image (Open Graph / Twitter) for every public page, per
 * language: the HERMITAGE wordmark on espresso. Deliberately typographic —
 * no demo photograph is presented as the studio's work.
 */
export const alt = "Hermitage Interior Design";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Literal paths so Next.js file tracing bundles the fonts with the route.
const cormorantFont = readFile(path.join(process.cwd(), "src/assets/og/cormorant-garamond-400.woff"));
const manropeFont = readFile(path.join(process.cwd(), "src/assets/og/manrope-500.woff"));

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "ru";
  const t = getDictionary(locale);
  const cities = seedSettings()
    .cities.map((c) => c.name[locale])
    .join("  /  ");
  const [cormorant, manrope] = await Promise.all([cormorantFont, manropeFont]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#211d1c",
          color: "#f5f2ed",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Cormorant",
            fontSize: 104,
            letterSpacing: 31,
            marginRight: -31,
            lineHeight: 1,
          }}
        >
          HERMITAGE
        </div>
        <div style={{ display: "flex", width: 560, height: 1, background: "#a18b70", marginTop: 34 }} />
        <div
          style={{
            display: "flex",
            fontFamily: "Manrope",
            fontSize: 22,
            letterSpacing: 11,
            marginRight: -11,
            marginTop: 30,
            color: "#a39e97",
          }}
        >
          INTERIOR DESIGN
        </div>
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: 52,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Manrope",
            fontSize: 22,
            color: "#a39e97",
          }}
        >
          <span>{t.footer.tagline}</span>
          <span>{cities}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cormorant", data: cormorant, weight: 400, style: "normal" },
        { name: "Manrope", data: manrope, weight: 500, style: "normal" },
      ],
    },
  );
}
