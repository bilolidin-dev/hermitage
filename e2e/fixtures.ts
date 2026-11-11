import { test as base, expect, type Page } from "@playwright/test";
import path from "node:path";

export const FIXTURES = path.join(__dirname, "fixtures");

/** Messages that are expected and not application errors. */
const IGNORED = [
  // Chromium logs a failed resource load for every intentional 404 page.
  /Failed to load resource: the server responded with a status of 404/,
];

/**
 * Every test fails if the page logs a console error or throws, which also
 * catches React hydration mismatches.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      const collect = (p: Page) => {
        p.on("console", (m) => {
          if (m.type() === "error" && !IGNORED.some((re) => re.test(m.text()))) errors.push(m.text().slice(0, 400));
        });
        p.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 400)}`));
      };
      collect(page);
      page.context().on("page", collect);
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Dismiss the one-time demo notice in the admin panel if it is shown. */
export async function dismissAdminNotice(page: Page) {
  const dismiss = page.getByRole("button", { name: "Понятно" });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
}

export function section(page: Page, heading: string) {
  return page.locator("section", { has: page.getByRole("heading", { name: heading, exact: true }) });
}
