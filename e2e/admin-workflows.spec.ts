import path from "node:path";
import { dismissAdminNotice, expect, FIXTURES, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/admin");
  await dismissAdminNotice(page);
});

test("services: create with validation, reorder, edit, guarded close, hide, delete", async ({ page, context }) => {
  await page.goto("/admin/services");
  await page.getByRole("button", { name: "Добавить услугу" }).first().click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("switch").click(); // visible on the site
  await drawer.getByLabel("Название (RU)").fill("Световой дизайн");
  await drawer.getByLabel("Описание (RU)").fill("Сценарии освещения для дома и общественных пространств.");
  await drawer.getByRole("button", { name: "Сохранить" }).click();
  await expect(drawer.getByText("Заполните перевод — без него нельзя опубликовать").first()).toBeVisible();

  await drawer.getByRole("tab", { name: /KY/ }).click();
  await drawer.getByLabel("Название (KY)").fill("Жарык дизайны");
  await drawer.getByLabel("Описание (KY)").fill("Үй жана коомдук мейкиндиктер үчүн жарык сценарийлери.");
  await drawer.getByRole("tab", { name: /UZ/ }).click();
  await drawer.getByLabel("Название (UZ)").fill("Yoritish dizayni");
  await drawer.getByLabel("Описание (UZ)").fill("Uy va jamoat makonlari uchun yoritish ssenariylari.");
  await drawer.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Услуга добавлена")).toBeVisible();

  const site = await context.newPage();
  await site.goto("/uz/services");
  await expect(site.getByRole("heading", { name: "Yoritish dizayni" })).toBeVisible();
  await expect(site.getByText("Maslahat")).toHaveCount(0); // hidden seed service stays hidden

  // Reorder: move the new (last) service up one place
  const rows = page.locator("ol > li");
  const count = await rows.count();
  await rows.last().getByRole("button", { name: "Переместить выше" }).click();
  await expect(page.getByText("Порядок сохранён")).toBeVisible();
  await expect(rows.nth(count - 2)).toContainText("Световой дизайн");

  // Edit
  await page.getByRole("button", { name: "Световой дизайн", exact: true }).click();
  await drawer.getByLabel("Название (RU)").fill("Световой дизайн и сценарии");
  await drawer.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Услуга сохранена")).toBeVisible();

  // Closing with unsaved changes asks first
  await page.getByRole("button", { name: "Световой дизайн и сценарии" }).click();
  await drawer.getByLabel("Название (RU)").fill("abc");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Уйти без сохранения?")).toBeVisible();
  await page.getByRole("button", { name: "Уйти без сохранения" }).click();
  await expect(page.getByRole("button", { name: "Световой дизайн и сценарии" })).toBeVisible();

  // Hide, then delete
  const row = page.locator("ol > li", { hasText: "Световой дизайн и сценарии" });
  await row.getByRole("button", { name: "Ещё действия" }).click();
  await page.getByRole("menuitem", { name: "Скрыть с сайта" }).click();
  await expect(page.getByText("Услуга скрыта с сайта")).toBeVisible();
  await site.goto("/ru/services");
  await expect(site.getByRole("heading", { name: "Услуги", level: 1 })).toBeVisible();
  await expect(site.getByRole("heading", { name: "Световой дизайн и сценарии" })).toHaveCount(0);

  await row.getByRole("button", { name: "Ещё действия" }).click();
  await page.getByRole("menuitem", { name: "Удалить" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Удалить" }).click();
  await expect(page.getByText("Услуга удалена")).toBeVisible();
});

test("settings: validation, then contacts, city note, SEO title and logo appear on the site", async ({
  page,
  context,
}) => {
  await page.goto("/admin/settings");
  await page.getByLabel("Номер WhatsApp").fill("12");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Номер в формате +996554884666")).toBeVisible();

  await page.getByLabel("Номер WhatsApp").fill("+996 700 123 456");
  await page.getByLabel("Примечание (RU)").first().fill("Демо-адрес: ул. Примерная, 1");
  await page.locator("section", { hasText: "SEO главной" }).getByLabel("Заголовок").first().fill("Hermitage — тестовый SEO заголовок");
  await page
    .locator("section", { has: page.getByRole("heading", { name: "Студия", exact: true }) })
    .locator("input[type=file]")
    .setInputFiles(path.join(FIXTURES, "logo.png"));
  await expect(page.getByRole("button", { name: "Вернуть текстовый логотип" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Настройки сохранены")).toBeVisible();

  const site = await context.newPage();
  await site.goto("/ru/contacts");
  await expect(site.getByText("+996 700 123 456").first()).toBeVisible();
  await expect(site.getByText("Демо-адрес: ул. Примерная, 1").first()).toBeVisible();
  await expect(site.locator("header img").first()).toHaveAttribute("src", /^blob:/);
  await site.goto("/ru");
  await expect(site).toHaveTitle("Hermitage — тестовый SEO заголовок");
});

test("projects list: blocked publish, duplicate, featured → hero, inline category, reorder, filters", async ({
  page,
  context,
}) => {
  await page.goto("/admin/projects");

  // An incomplete draft cannot be published, with an explanation
  await page.locator("tr", { hasText: "Минималистичная кухня" }).getByRole("button", { name: "Ещё действия" }).click();
  await page.getByRole("menuitem", { name: "Опубликовать" }).click();
  await expect(page.getByText("Чтобы опубликовать проект, заполните тексты на трёх языках")).toBeVisible();

  // Duplicate creates a draft copy
  await page.locator("tr", { hasText: "Офис со стеклянными перегородками" }).first().getByRole("button", { name: "Ещё действия" }).click();
  await page.getByRole("menuitem", { name: "Дублировать" }).click();
  await expect(page.getByText("Создана копия")).toBeVisible();
  await expect(page.locator("tr", { hasText: "(копия)" })).toContainText("Черновик");

  // Featured toggle feeds the homepage hero
  const bedroom = page.locator("tr", { hasText: "Графитовая спальня" });
  await bedroom.getByRole("button", { name: "Сделать избранным" }).click();
  await expect(page.getByText("Проект отмечен избранным")).toBeVisible();
  const site = await context.newPage();
  await site.goto("/ru");
  await expect(site.getByText("01 / 04")).toBeVisible();

  // Inline category change
  await bedroom.getByRole("combobox").selectOption("hospitality");
  await expect(page.getByText("Категория изменена")).toBeVisible();

  // Reorder via the menu; the public list follows
  const firstTitle = await page.locator("tbody tr").first().locator("a").first().innerText();
  await page.locator("tbody tr").first().getByRole("button", { name: "Ещё действия" }).click();
  await page.getByRole("menuitem", { name: "Переместить ниже" }).click();
  await expect(page.getByText("Порядок сохранён")).toBeVisible();
  await expect(page.locator("tbody tr").nth(1).locator("a").first()).toHaveText(firstTitle);
  await site.goto("/ru/projects?view=list");
  await expect(site.locator("main ul li h2").nth(1)).toHaveText(firstTitle);

  // Status filter is reflected in the URL
  await page.getByRole("button", { name: "Черновики" }).click();
  await expect(page).toHaveURL(/status=draft/);
  await expect(page.locator("tbody tr")).toHaveCount(3);
});

test("admin language switch and global search", async ({ page }) => {
  await page.goto("/admin/projects");
  await page.getByRole("button", { name: "UZ" }).click();
  await expect(page.getByRole("heading", { name: "Loyihalar", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "KY" }).click();
  await expect(page.getByRole("heading", { name: "Долбоорлор", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "RU" }).click();

  await page.getByRole("combobox").first().fill("бал");
  await page.getByRole("option", { name: /Зал с деревянными балками/ }).click();
  await expect(page).toHaveURL(/demo_hall_beams/);
});

test("demo reset restores projects, services and settings", async ({ page, context }) => {
  await page.goto("/admin/settings");
  await page.getByLabel("Номер WhatsApp").fill("+996 700 000 001");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Настройки сохранены")).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("button", { name: "Сбросить демо-данные" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Сбросить" }).click();
  await expect(page.getByText("Демо-данные восстановлены").first()).toBeVisible();

  await page.goto("/admin/projects");
  await expect(page.locator("tbody tr")).toHaveCount(7);
  const site = await context.newPage();
  await site.goto("/ru/contacts");
  await expect(site.getByText("+996 554 884 666").first()).toBeVisible();
});
