import { expect, test } from "./fixtures";

test.describe("languages and routing", () => {
  for (const [locale, title] of [
    ["ru", "Проекты"],
    ["ky", "Долбоорлор"],
    ["uz", "Loyihalar"],
  ] as const) {
    test(`/${locale}/projects is served with lang="${locale}" and translated`, async ({ page }) => {
      const response = await page.goto(`/${locale}/projects`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    });
  }

  test("unknown page inside a language shows that language's 404", async ({ page }) => {
    const response = await page.goto("/ky/nonexistent-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Барак табылган жок" })).toBeVisible();
  });

  test("unknown language prefix shows the three-language 404", async ({ page }) => {
    const response = await page.goto("/xx/projects");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sahifa topilmadi" })).toBeVisible();
  });

  test("draft projects are not reachable by URL", async ({ page }) => {
    await page.goto("/ru/projects/minimal-kitchen");
    await expect(page.getByRole("heading", { name: "Проект не найден" })).toBeVisible();
  });

  test("language switch keeps the page and its filters", async ({ page }) => {
    await page.goto("/ru/projects?category=house");
    await expect(page.getByRole("button", { name: /Частные дома/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "UZ", exact: true }).first().click();
    await expect(page).toHaveURL(/\/uz\/projects\?category=house$/);
    await expect(page.getByRole("button", { name: /Xususiy uylar/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("root redirects to the default language", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/ru");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  });
});

test.describe("public site behaviour", () => {
  test("hero carousel can be paused (WCAG 2.2.2)", async ({ page }) => {
    await page.goto("/ru");
    const pause = page.getByRole("button", { name: "Остановить смену проектов" });
    await expect(pause).toBeVisible();
    await pause.click();
    await expect(page.getByRole("button", { name: "Возобновить смену проектов" })).toHaveAttribute("aria-pressed", "true");
  });

  test("projects archive: category filter, search with empty state, list view", async ({ page }) => {
    await page.goto("/ru/projects");
    await page.getByRole("button", { name: /Коммерческие пространства/ }).click();
    await expect(page.locator("main article h2")).toHaveCount(1);
    await page.getByRole("button", { name: /^Все/ }).click();
    await page.getByPlaceholder("Название или город").fill("несуществующий");
    await expect(page.getByText("Ничего не нашлось")).toBeVisible();
    await page.getByRole("button", { name: "Показать все проекты" }).click();
    await page.getByRole("button", { name: "Список" }).click();
    await expect(page).toHaveURL(/view=list/);
    await expect(page.locator("main ul li h2")).toHaveCount(5);
    await expect(page.locator("main ul li").first()).toContainText("Демо-проект");
  });

  test("project page lightbox opens, navigates with the keyboard and closes", async ({ page }) => {
    await page.goto("/ru/projects/house-by-dark-garden");
    await page.getByRole("button", { name: "Открыть изображение 1" }).click();
    const viewer = page.getByRole("dialog");
    await expect(viewer.getByText("1 из 4")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText("2 из 4")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("mobile menu: page behind becomes inert, focus moves in, Escape closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ru/about");
    await page.getByRole("button", { name: "Меню" }).click();
    await expect(page.locator("main#content")).toHaveAttribute("inert", "");
    await expect(page.locator("#mobile-menu a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
    await expect(page.locator("main#content")).not.toHaveAttribute("inert", "");
  });

  test("contact form validates and opens WhatsApp with a prepared message", async ({ page, context }) => {
    // Never call the real WhatsApp service from tests.
    await context.route("https://wa.me/**", (route) => route.fulfill({ status: 200, body: "stub" }));
    await page.goto("/ru/contacts");
    await page.getByRole("button", { name: "Открыть WhatsApp" }).click();
    await expect(page.getByText("Укажите имя")).toBeVisible();
    await page.getByLabel("Как к вам обращаться").fill("Айгуль");
    await page.getByLabel("Коротко о проекте").fill("Квартира 90 м²");
    const popupPromise = context.waitForEvent("page");
    await page.getByRole("button", { name: "Открыть WhatsApp" }).click();
    const popup = await popupPromise;
    const url = new URL(popup.url());
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/996554884666");
    expect(url.searchParams.get("text")).toContain("Меня зовут Айгуль.");
    expect(url.searchParams.get("text")).toContain("Квартира 90 м²");
    await popup.close();
  });
});

test.describe("first-visit intro", () => {
  const state = (page: import("@playwright/test").Page) =>
    page.evaluate(() => ({
      attr: document.documentElement.getAttribute("data-intro"),
      display: getComputedStyle(document.querySelector(".site-intro")!).display,
    }));

  test("plays once per session, then never on navigation, language switch or reload", async ({ page }) => {
    await page.goto("/ru", { waitUntil: "domcontentloaded" });
    expect(await state(page)).toEqual({ attr: "play", display: "grid" });
    expect(await page.evaluate(() => sessionStorage.getItem("hermitage.intro.v1"))).toBe("1");
    // Gone after 1.5s (attribute removed shortly after the animation).
    await expect.poll(() => state(page), { timeout: 4000 }).toEqual({ attr: null, display: "none" });

    await page.getByRole("link", { name: "Проекты" }).first().click();
    await page.waitForURL("**/ru/projects");
    expect(await state(page)).toEqual({ attr: null, display: "none" });
    await page.getByRole("link", { name: "KY", exact: true }).first().click();
    await page.waitForURL("**/ky/projects");
    expect(await state(page)).toEqual({ attr: null, display: "none" });
    await page.reload({ waitUntil: "domcontentloaded" });
    expect(await state(page)).toEqual({ attr: null, display: "none" });
  });

  test("does not block the page while it plays", async ({ page }) => {
    await page.goto("/ru/about", { waitUntil: "domcontentloaded" });
    expect((await state(page)).attr).toBe("play");
    await page.getByRole("link", { name: "Контакты" }).first().click();
    await page.waitForURL("**/ru/contacts");
  });

  test("is skipped for visitors who prefer reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/ru", { waitUntil: "domcontentloaded" });
    expect(await state(page)).toEqual({ attr: null, display: "none" });
    await context.close();
  });
});

test.describe("data integrity", () => {
  test("a corrupted record is skipped, valid ones are kept, and the original is backed up", async ({ page }) => {
    await page.goto("/ru");
    // Wait until the app has seeded storage, then corrupt it.
    await page.waitForFunction(() => localStorage.getItem("hermitage.demo.v1.projects") !== null);
    await page.evaluate(() => {
      const key = "hermitage.demo.v1.projects";
      const list = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
      list.push({ id: "broken", slug: 42 });
      localStorage.setItem(key, JSON.stringify(list));
    });
    await page.goto("/ru/projects");
    await expect(page.getByText("5 проектов")).toBeVisible();
    const backup = await page.evaluate(() => localStorage.getItem("hermitage.demo.v1.projects.recovered"));
    expect(backup).toContain('"broken"');
  });

  test("invalid JSON falls back to demo data without breaking the page", async ({ page }) => {
    await page.goto("/ru");
    await page.evaluate(() => localStorage.setItem("hermitage.demo.v1.settings", "{not json"));
    await page.goto("/ru/contacts");
    await expect(page.getByText("+996 554 884 666").first()).toBeVisible();
  });

  test("an unsafe image reference stored in the browser is never rendered", async ({ page }) => {
    await page.goto("/ru");
    // Wait until the app has seeded storage, then corrupt it.
    await page.waitForFunction(() => localStorage.getItem("hermitage.demo.v1.projects") !== null);
    await page.evaluate(() => {
      const key = "hermitage.demo.v1.projects";
      const list = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<Record<string, unknown>>;
      list[0]!.cover = "//evil.example/x.jpg";
      localStorage.setItem(key, JSON.stringify(list));
    });
    await page.goto("/ru/projects");
    await expect(page.getByRole("heading", { name: "Дом у тёмного сада" })).toBeVisible();
    await expect(page.locator('img[src*="evil.example"]')).toHaveCount(0);
  });
});
