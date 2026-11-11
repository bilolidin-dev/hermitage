import type { MediaAsset } from "@/lib/domain/types";

/**
 * Demonstration photographs (Unsplash licence) shipped in /public/demo.
 * They illustrate layouts only and are not the studio's work.
 */
const FILES = [
  { file: "bath-graphite", width: 1333, height: 2000 },
  { file: "bedroom-calm", width: 2000, height: 1333 },
  { file: "bedroom-dark", width: 2000, height: 1270 },
  { file: "corner-yellow", width: 2000, height: 1765 },
  { file: "dining-green", width: 2000, height: 1125 },
  { file: "entry-oak", width: 1125, height: 2000 },
  { file: "hall-beams", width: 1500, height: 2000 },
  { file: "house-dusk", width: 2000, height: 1333 },
  { file: "house-night", width: 1333, height: 2000 },
  { file: "house-timber", width: 2000, height: 1333 },
  { file: "house-tree", width: 2000, height: 1333 },
  { file: "kitchen-white", width: 2000, height: 1328 },
  { file: "living-light", width: 2000, height: 1125 },
  { file: "living-soft", width: 2000, height: 1465 },
  { file: "living-warm", width: 2000, height: 1055 },
  { file: "living-wood", width: 2000, height: 1360 },
  { file: "lounge-pendants", width: 2000, height: 2000 },
  { file: "office-corridor", width: 2000, height: 1335 },
  { file: "office-glass", width: 2000, height: 1335 },
  { file: "stair-light", width: 1333, height: 2000 },
  { file: "study-green", width: 2000, height: 1500 },
  { file: "villa-pool", width: 1333, height: 2000 },
  { file: "villa-terrace", width: 2000, height: 1327 },
  { file: "villa-white", width: 2000, height: 1333 },
] as const;

export const demo = (file: (typeof FILES)[number]["file"]) => `/demo/${file}.jpg`;

export const DEMO_MEDIA: MediaAsset[] = FILES.map((f) => ({
  id: `demo_${f.file}`,
  ref: demo(f.file),
  name: `${f.file}.jpg`,
  type: "image/jpeg",
  size: null,
  width: f.width,
  height: f.height,
  source: "demo",
  createdAt: "2026-01-01T00:00:00.000Z",
}));

const DIMENSIONS = new Map<string, { width: number; height: number }>(
  FILES.map((f) => [demo(f.file), { width: f.width, height: f.height }]),
);

export function demoDimensions(ref: string) {
  return DIMENSIONS.get(ref) ?? null;
}
