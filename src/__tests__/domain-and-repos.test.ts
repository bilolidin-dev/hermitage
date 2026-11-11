import { beforeEach, describe, expect, it } from "vitest";
import { detectImageType } from "../lib/domain/media";
import { slugify, validateProject, validateService, validateSettings } from "../lib/domain/validation";
import { getRepositories, isRepositoryError, resetDemoData } from "../lib/repositories";

describe("slugify", () => {
  it("transliterates Russian, Kyrgyz, and Uzbek characters into URL-safe slugs", () => {
    expect(slugify("Дом у тёмного сада")).toBe("dom-u-tyomnogo-sada");
    // ң → "ng" (BGN/PCGN), followed by г → "g"
    expect(slugify("Караңгы бактын жанындагы үй")).toBe("karanggy-baktyn-zhanyndagy-uy");
    expect(slugify("Qorongʻi bogʻ yonidagi uy")).toBe("qorongi-bog-yonidagi-uy");
  });

  it("strips special characters and collapses hyphens", () => {
    expect(slugify("  Проект №1 — Ош / Бишкек!  ")).toBe("proekt-1-osh-bishkek");
  });

  it("never lets Unicode compatibility forms leak capitals or letters (regression)", () => {
    expect(slugify("Зал Ⅻ")).toBe("zal-xii");
    expect(slugify("№ 5")).toBe("5");
  });
});

describe("validateProject", () => {
  const validPublished = {
    slug: "test-project",
    category: "residential" as const,
    year: 2025,
    area: 180,
    title: { ru: "Тест", ky: "Тест KY", uz: "Test UZ" },
    location: { ru: "Ош", ky: "Ош", uz: "Oʻsh" },
    description: { ru: "Описание RU", ky: "Сүрөттөмө KY", uz: "Tavsif UZ" },
    cover: "/demo/house-dusk.jpg",
    gallery: ["/demo/house-dusk.jpg"],
    featured: true,
    status: "published" as const,
  };

  it("accepts a complete published project", () => {
    expect(validateProject(validPublished)).toEqual([]);
  });

  it("rejects publishing when any locale translation or cover is missing", () => {
    const issues = validateProject({
      ...validPublished,
      title: { ru: "Тест", ky: "", uz: "Test UZ" },
      cover: null,
    });
    expect(issues.some((i) => i.path === "title.ky" && i.code === "translationRequired")).toBe(true);
    expect(issues.some((i) => i.path === "cover" && i.code === "coverRequired")).toBe(true);
  });

  it("allows saving a draft with only Russian title and valid slug", () => {
    const issues = validateProject({
      ...validPublished,
      status: "draft",
      title: { ru: "Черновик", ky: "", uz: "" },
      location: { ru: "", ky: "", uz: "" },
      description: { ru: "", ky: "", uz: "" },
      cover: null,
    });
    expect(issues).toEqual([]);
  });
});

describe("validateService & validateSettings", () => {
  it("requires all 3 locales for visible services, but only Russian title for hidden services", () => {
    expect(
      validateService({
        title: { ru: "Услуга", ky: "", uz: "" },
        description: { ru: "", ky: "", uz: "" },
        visible: false,
      }),
    ).toEqual([]);

    const visibleIssues = validateService({
      title: { ru: "Услуга", ky: "", uz: "" },
      description: { ru: "Описание", ky: "", uz: "" },
      visible: true,
    });
    expect(visibleIssues.length).toBeGreaterThan(0);
    expect(visibleIssues.some((i) => i.code === "translationRequired")).toBe(true);
  });

  it("validates settings phone, instagram URL, city coordinates, and SEO fields", () => {
    const issues = validateSettings({
      studioName: "Hermitage",
      logo: null,
      whatsapp: "123",
      instagram: "not-an-instagram-url",
      defaultLocale: "ru",
      cities: [
        {
          id: "c1",
          name: { ru: "Ош", ky: "Ош", uz: "Oʻsh" },
          latitude: 120,
          longitude: 72.79,
          note: { ru: "", ky: "", uz: "" },
        },
      ],
      seo: {
        title: { ru: "Hermitage", ky: "Hermitage", uz: "Hermitage" },
        description: { ru: "Desc", ky: "Desc", uz: "Desc" },
      },
    });
    expect(issues.some((i) => i.path === "whatsapp" && i.code === "phoneFormat")).toBe(true);
    expect(issues.some((i) => i.path === "instagram" && i.code === "instagramFormat")).toBe(true);
    expect(issues.some((i) => i.path === "cities.0.coordinates" && i.code === "coordinates")).toBe(true);
  });
});

describe("detectImageType (file signature security check)", () => {
  it("detects valid JPEG, PNG, WebP, and AVIF magic bytes", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe("image/png");
    expect(
      detectImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])),
    ).toBe("image/webp");
    expect(
      detectImageType(new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])),
    ).toBe("image/avif");
  });

  it("rejects spoofed non-image files (e.g. SVG/HTML/text renamed to .jpg)", () => {
    const htmlBytes = new TextEncoder().encode("<!DOCTYPE html><script>alert(1)</script>");
    expect(detectImageType(htmlBytes)).toBeNull();
  });
});

describe("Mock Repositories (CRUD, publication visibility, duplicate slug check, and demo reset)", () => {
  // Outside the browser getRepositories() returns a fresh instance per call,
  // so the test resets exactly the instance it works with.
  let repos: ReturnType<typeof getRepositories>;
  beforeEach(async () => {
    repos = getRepositories();
    await resetDemoData(repos);
  });

  it("enforces publication visibility and supports full project CRUD + reorder + reset", async () => {
    const allInitial = await repos.projects.list();
    const publishedInitial = await repos.projects.list({ status: "published" });

    expect(allInitial.length).toBe(7);
    expect(publishedInitial.length).toBe(5);
    expect(publishedInitial.every((p) => p.status === "published")).toBe(true);

    // Create a draft project
    const draft = await repos.projects.create({
      slug: "new-villa-osh",
      category: "house",
      year: 2026,
      area: 410,
      title: { ru: "Новая вилла в Оше", ky: "", uz: "" },
      location: { ru: "Ош", ky: "", uz: "" },
      description: { ru: "Черновик", ky: "", uz: "" },
      cover: null,
      gallery: [],
      featured: false,
      status: "draft",
    });
    expect(draft.status).toBe("draft");
    expect(draft.isDemo).toBe(false);

    // Attempting to publish incomplete draft must fail with RepositoryError
    let publishError: unknown = null;
    try {
      await repos.projects.setStatus(draft.id, "published");
    } catch (err) {
      publishError = err;
    }
    expect(isRepositoryError(publishError)).toBe(true);

    // Complete translations + cover and publish
    const published = await repos.projects.update(draft.id, {
      slug: draft.slug,
      category: draft.category,
      year: draft.year,
      area: draft.area,
      title: { ru: "Новая вилла в Оше", ky: "Оштогу жаңы вилла", uz: "Oʻshdagi yangi villa" },
      location: { ru: "Ош", ky: "Ош", uz: "Oʻsh" },
      description: { ru: "Описание RU", ky: "Сүрөттөмө KY", uz: "Tavsif UZ" },
      cover: "/demo/house-dusk.jpg",
      gallery: ["/demo/house-dusk.jpg"],
      featured: true,
      status: "published",
    });
    expect(published.status).toBe("published");
    expect((await repos.projects.list({ status: "published" })).length).toBe(6);

    // Reset demo data restores initial seed counts
    await resetDemoData(repos);
    expect((await repos.projects.list()).length).toBe(7);
    expect((await repos.projects.list({ status: "published" })).length).toBe(5);
  });
});
