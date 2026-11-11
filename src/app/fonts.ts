import { Cormorant_Garamond, Manrope } from "next/font/google";

// cyrillic-ext covers the Kyrgyz letters ң ө ү; latin covers Uzbek oʻ gʻ (U+02BB).
export const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-manrope",
  display: "swap",
});

export const fontVariables = `${cormorant.variable} ${manrope.variable}`;
