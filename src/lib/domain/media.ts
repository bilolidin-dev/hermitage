/**
 * Media rules shared by the repositories and the UI. Pure functions, so they
 * are unit-testable and reusable in a future server/Storage rule.
 */

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/**
 * Identify an image by its first bytes instead of trusting the file name or
 * the browser-reported MIME type. Returns null for anything else (including
 * SVG, which can carry scripts and is intentionally not accepted).
 */
export function detectImageType(bytes: Uint8Array): AcceptedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && ascii(bytes, 1, 3) === "PNG" && bytes[0] === 0x89) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brands = ascii(bytes, 8, Math.min(bytes.length - 8, 24));
    if (brands.includes("avif") || brands.includes("avis")) return "image/avif";
  }
  return null;
}

/**
 * Allowed image references:
 *  - /demo/<file>      demo assets shipped with the site
 *  - /brand/<file>     original brand assets placed in /public/brand
 *  - local:<id>        browser-local uploads (demo mode)
 *  - https://…         future cloud storage URLs
 * Protocol-relative ("//host"), javascript:, data: and other schemes are rejected.
 */
const MEDIA_REF = /^(\/(demo|brand)\/[A-Za-z0-9._\-/]+|local:[A-Za-z0-9_-]+|https:\/\/[^\s"'<>]+)$/;

export function isValidMediaRef(ref: unknown): ref is string {
  return typeof ref === "string" && MEDIA_REF.test(ref) && !ref.includes("..");
}
