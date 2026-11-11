import { expect, test } from "./fixtures";

/**
 * Responsive sweep (browser emulation, not real devices): every public route
 * in every language plus the main admin screens, at the 11 widths from the
 * brief. Checks horizontal overflow, broken images and console errors.
 */
const WIDTHS = [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440, 1920];
const PUBLIC = ["", "/projects", "/projects?view=list", "/projects/house-by-dark-garden", "/services", "/about", "/process", "/contacts"];
const ROUTES = [
  ...["ru", "ky", "uz"].flatMap((l) => PUBLIC.map((p) => `/${l}${p}`)),
  "/admin",
  "/admin/projects",
  "/admin/projects/new",
  "/admin/projects/demo_apartment_oak",
  "/admin/services",
  "/admin/media",
  "/admin/settings",
];

for (const width of WIDTHS) {
  test(`no overflow or broken images at ${width}px`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    const problems: string[] = [];
    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const result = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const broken = [...document.images]
          .filter((i) => i.complete && i.naturalWidth === 0 && !!i.currentSrc)
          .map((i) => i.currentSrc.slice(-60));
        const offenders =
          overflow > 0
            ? [...document.querySelectorAll<HTMLElement>("body *")]
                .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
                .slice(0, 3)
                .map((el) => `${el.tagName}.${String(el.className).slice(0, 50)}`)
            : [];
        return { overflow, broken, offenders };
      });
      if (result.overflow > 0) problems.push(`${route}: overflow ${result.overflow}px ${result.offenders.join(" | ")}`);
      if (result.broken.length) problems.push(`${route}: broken images ${result.broken.join(", ")}`);
    }
    expect(problems, `layout problems at ${width}px`).toEqual([]);
  });
}
