import path from "node:path";
import { dismissAdminNotice, expect, FIXTURES, section, test } from "./fixtures";

/**
 * The 21-step demonstration workflow from the brief: create a project in
 * three languages, add and reorder images, preview, save as draft, publish,
 * find it on the site, switch languages, unpublish and delete it.
 */
test("project lifecycle: create → draft → publish → public → unpublish → delete", async ({ page, context }) => {
  const TITLE = "Тестовый дом над рекой";

  // 1–2. Open the admin and start a new project
  await page.goto("/admin");
  await dismissAdminNotice(page);
  await page.getByRole("link", { name: "Новый проект" }).first().click();
  await page.waitForURL("**/admin/projects/new");

  // Validation: an empty draft cannot be saved
  await page.getByRole("button", { name: "Сохранить черновик" }).first().click();
  await expect(page.getByText("Заполните поле").first()).toBeVisible();

  // 3–5. Content in three languages
  await page.getByLabel("Название (RU)").fill(TITLE);
  await page.getByLabel("Город или район (RU)").fill("Ош");
  await page.getByLabel("Описание (RU)").fill("Первый абзац тестового проекта.\n\nВторой абзац с подробностями.");
  await page.getByRole("tab", { name: /KY/ }).click();
  await page.getByLabel("Название (KY)").fill("Дарыянын үстүндөгү сыноо үйү");
  await page.getByLabel("Город или район (KY)").fill("Ош");
  await page.getByLabel("Описание (KY)").fill("Сыноо долбоорунун биринчи абзацы.\n\nЭкинчи абзац.");
  await page.getByRole("tab", { name: /UZ/ }).click();
  await page.getByLabel("Название (UZ)").fill("Daryo ustidagi sinov uyi");
  await page.getByLabel("Город или район (UZ)").fill("Oʻsh");
  await page.getByLabel("Описание (UZ)").fill("Sinov loyihasining birinchi xatboshisi.\n\nIkkinchi xatboshi.");
  const slug = await page.getByLabel("Адрес страницы").inputValue();
  expect(slug).toBe("testovyy-dom-nad-rekoy");

  // 6. Category
  await page.getByLabel("Категория", { exact: true }).selectOption("commercial");

  // 7. Cover from the device (with progress)
  const cover = section(page, "Обложка");
  await cover.locator("input[type=file]").setInputFiles(path.join(FIXTURES, "one.jpg"));
  await expect(cover.getByRole("button", { name: "Заменить" })).toBeVisible({ timeout: 15_000 });

  // 8. Gallery: two local images + one from the library
  const gallery = section(page, "Галерея");
  await gallery
    .locator("input[type=file]")
    .first()
    .setInputFiles([path.join(FIXTURES, "two.jpg"), path.join(FIXTURES, "three.jpg")]);
  await expect(gallery.getByText("2 изображения")).toBeVisible({ timeout: 15_000 });
  await gallery.getByRole("button", { name: "Медиатека" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "house-tree.jpg" }).click();
  await page.getByRole("button", { name: "Добавить выбранные (1)" }).click();
  await expect(gallery.getByText("3 изображения")).toBeVisible();

  // 9. Reorder
  const order = () => gallery.locator("ol img").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
  const before = await order();
  await gallery.getByRole("button", { name: "Сдвинуть вперёд" }).first().click();
  const after = await order();
  expect(after[0]).toBe(before[1]);
  expect(after[1]).toBe(before[0]);

  // 10. Preview: opens in the language tab being edited (UZ here), then switches
  await page.getByRole("button", { name: "Предпросмотр" }).click();
  const preview = page.getByRole("dialog");
  await expect(preview.getByRole("heading", { level: 1, name: "Daryo ustidagi sinov uyi" })).toBeVisible();
  await preview.getByRole("button", { name: "RU", exact: true }).click();
  await expect(preview.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  await preview.getByRole("button", { name: "KY", exact: true }).click();
  await expect(preview.getByRole("heading", { level: 1, name: "Дарыянын үстүндөгү сыноо үйү" })).toBeVisible();
  await page.getByRole("button", { name: "Закрыть предпросмотр" }).click();

  // Unsaved-changes guard on in-app navigation
  await page.locator("aside").getByRole("link", { name: "Услуги" }).first().click();
  await expect(page.getByText("Уйти без сохранения?")).toBeVisible();
  await page.getByRole("button", { name: "Остаться" }).click();
  await expect(page).toHaveURL(/\/admin\/projects\/new/);

  // 11. Save as draft
  await page.getByRole("button", { name: "Сохранить черновик" }).first().click();
  await page.waitForURL(/\/admin\/projects\/prj_/);
  await expect(page.getByText("Черновик сохранён")).toBeVisible();

  // Draft is not public
  const site = await context.newPage();
  await site.goto(`/ru/projects/${slug}`);
  await expect(site.getByRole("heading", { name: "Проект не найден" })).toBeVisible();

  // Browser refresh: texts (localStorage) and images (IndexedDB) survive
  await page.reload();
  await expect(page.getByLabel("Название (RU)")).toHaveValue(TITLE);
  await expect(cover.locator("img").first()).toHaveAttribute("src", /^blob:/);
  await expect(gallery.getByText("3 изображения")).toBeVisible();

  // 12. Publish
  await page.locator("label", { hasText: "Опубликован" }).click();
  await page.getByRole("button", { name: "Сохранить и опубликовать" }).first().click();
  await expect(page.getByText("Изменения сохранены")).toBeVisible();

  // 13–15. Find it on the public site and open it
  await site.goto("/ru/projects");
  await site.getByRole("heading", { name: TITLE }).click();
  await site.waitForURL(`**/ru/projects/${slug}`);
  await expect(site.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  // Local images from IndexedDB render on the public page too
  await expect(site.locator("article header img").first()).toHaveAttribute("src", /^blob:/);

  // 16. Switch languages on the same page
  await site.getByRole("link", { name: "KY", exact: true }).first().click();
  await site.waitForURL(`**/ky/projects/${slug}`);
  await expect(site.getByRole("heading", { level: 1, name: "Дарыянын үстүндөгү сыноо үйү" })).toBeVisible();
  await expect(site.locator("html")).toHaveAttribute("lang", "ky");
  await site.getByRole("link", { name: "UZ", exact: true }).first().click();
  await expect(site.getByRole("heading", { level: 1, name: "Daryo ustidagi sinov uyi" })).toBeVisible();

  // 17–20. Back in the admin: unpublish, project disappears from the site
  await page.locator("label", { hasText: "Черновик" }).click();
  await page.getByRole("button", { name: "Сохранить черновик" }).first().click();
  await expect(page.getByText("Изменения сохранены").last()).toBeVisible();
  await site.goto("/ru/projects");
  await expect(site.getByRole("heading", { name: "Проекты", level: 1 })).toBeVisible();
  await expect(site.getByRole("heading", { name: TITLE })).toHaveCount(0);

  // 21. Delete with confirmation
  await page.getByRole("button", { name: "Удалить проект" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Удалить" }).click();
  await page.waitForURL("**/admin/projects");
  await expect(page.getByText("Проект удалён")).toBeVisible();
  await expect(page.getByText(TITLE)).toHaveCount(0);
});

test("upload validation rejects disguised, unsafe and oversized files", async ({ page }) => {
  await page.goto("/admin/projects/new");
  await dismissAdminNotice(page);
  const gallery = section(page, "Галерея");
  const input = gallery.locator("input[type=file]").first();

  await input.setInputFiles([
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") },
    // Text pretending to be a JPEG: the extension and MIME type lie, the bytes do not.
    { name: "fake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<html><script>alert(1)</script></html>") },
    {
      name: "vector.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'),
    },
    { name: "huge.png", mimeType: "image/png", buffer: Buffer.alloc(8 * 1024 * 1024 + 1, 0) },
  ]);

  await expect(page.getByText("«notes.txt»: неподдерживаемый формат")).toBeVisible();
  await expect(page.getByText("«fake.jpg»: неподдерживаемый формат")).toBeVisible();
  await expect(page.getByText("«vector.svg»: неподдерживаемый формат")).toBeVisible();
  await expect(page.getByText(/«huge\.png»: файл больше 8 МБ/)).toBeVisible();
  await expect(gallery.getByText("В галерее пока нет изображений")).toBeVisible();
});
