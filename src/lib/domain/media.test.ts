import { describe, expect, it } from "vitest";
import { ACCEPTED_IMAGE_TYPES, detectImageType, isValidMediaRef } from "./media";

const bytes = (...parts: Array<number | string>) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : [p])));

describe("detectImageType", () => {
  it("recognises real image signatures", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(detectImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP", "VP8 "))).toBe("image/webp");
    expect(detectImageType(bytes(0, 0, 0, 0x1c, "ftyp", "mif1", 0, 0, 0, 0, "avif"))).toBe("image/avif");
  });

  it("rejects SVG, documents, empty input and truncated headers", () => {
    expect(detectImageType(bytes('<?xml version="1.0"?><svg xmlns='))).toBeNull();
    expect(detectImageType(bytes("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImageType(bytes("%PDF-1.4"))).toBeNull();
    expect(detectImageType(bytes("GIF89a"))).toBeNull();
    expect(detectImageType(bytes(0xff, 0xd8))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });

  it("does not accept SVG as an upload type", () => {
    expect(ACCEPTED_IMAGE_TYPES as readonly string[]).not.toContain("image/svg+xml");
  });
});

describe("isValidMediaRef", () => {
  it("accepts demo, brand, local and https references", () => {
    expect(isValidMediaRef("/demo/house-dusk.jpg")).toBe(true);
    expect(isValidMediaRef("/brand/logo.png")).toBe(true);
    expect(isValidMediaRef("local:img_mwbdon27ae0c95ab")).toBe(true);
    expect(isValidMediaRef("https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media")).toBe(true);
  });

  it("rejects unsafe or unknown references", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "//evil.example/x.jpg",
      "http://insecure.example/x.jpg",
      "/demo/../secret",
      "/etc/passwd",
      "local:../x",
      'https://x.example/a.jpg" onerror="alert(1)',
      "",
      null,
      undefined,
      42,
    ]) {
      expect(isValidMediaRef(bad), String(bad)).toBe(false);
    }
  });
});
