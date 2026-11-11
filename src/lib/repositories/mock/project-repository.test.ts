import { beforeEach, describe, expect, it } from "vitest";
import { toProjectInput, type ProjectInput } from "@/lib/domain/types";
import { seedProjects } from "@/lib/seed/projects";
import { seedServices } from "@/lib/seed/services";
import { seedSettings } from "@/lib/seed/settings";
import { validateProject, validateService, validateSettings } from "@/lib/domain/validation";
import { isRepositoryError } from "../errors";
import { LocalActivityRepository } from "./activity-repository";
import { LocalProjectRepository } from "./project-repository";
import type { KeyValueStorage } from "./storage";

function memory(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    persistent: true,
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

const complete: ProjectInput = {
  slug: "test-house",
  category: "house",
  title: { ru: "Тест", ky: "Тест", uz: "Test" },
  location: { ru: "Ош", ky: "Ош", uz: "Oʻsh" },
  description: { ru: "Описание", ky: "Сүрөттөмө", uz: "Tavsif" },
  year: 2025,
  area: 100,
  cover: "/demo/house-dusk.jpg",
  gallery: ["/demo/house-tree.jpg"],
  featured: false,
  status: "draft",
};

let repo: LocalProjectRepository;
let activity: LocalActivityRepository;

beforeEach(() => {
  const storage = memory();
  activity = new LocalActivityRepository(storage);
  repo = new LocalProjectRepository(storage, activity);
});

describe("seed data", () => {
  it("every seed project, service and the settings pass their own validation", () => {
    for (const p of seedProjects()) expect(validateProject(toProjectInput(p)), p.slug).toEqual([]);
    for (const s of seedServices()) expect(validateService(s), s.id).toEqual([]);
    expect(validateSettings(seedSettings())).toEqual([]);
  });

  it("every seed project is marked as demo content", () => {
    expect(seedProjects().every((p) => p.isDemo)).toBe(true);
  });
});

describe("LocalProjectRepository", () => {
  it("getPublishedBySlug never returns drafts", async () => {
    const draft = (await repo.list({ status: "draft" }))[0]!;
    expect(await repo.getPublishedBySlug(draft.slug)).toBeNull();
    const pub = (await repo.list({ status: "published" }))[0]!;
    expect((await repo.getPublishedBySlug(pub.slug))?.id).toBe(pub.id);
  });

  it("create → publish → unpublish → delete, with activity recorded", async () => {
    const created = await repo.create(complete);
    expect(created.isDemo).toBe(false);
    expect(created.publishedAt).toBeNull();
    expect((await repo.list())[0]?.id).toBe(created.id); // new projects open the portfolio

    const published = await repo.setStatus(created.id, "published");
    expect(published.publishedAt).not.toBeNull();
    expect((await repo.getPublishedBySlug("test-house"))?.id).toBe(created.id);

    await repo.setStatus(created.id, "draft");
    expect(await repo.getPublishedBySlug("test-house")).toBeNull();

    await repo.delete(created.id);
    expect(await repo.getById(created.id)).toBeNull();
    await expect(repo.delete(created.id)).rejects.toMatchObject({ code: "not_found" });

    const actions = (await activity.list(10)).map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining(["project.created", "project.published", "project.unpublished", "project.deleted"]),
    );
  });

  it("refuses to publish an incomplete project and reports the missing fields", async () => {
    const draft = (await repo.list({ status: "draft" })).find((p) => !p.title.uz)!;
    const error = await repo.setStatus(draft.id, "published").catch((e: unknown) => e);
    expect(isRepositoryError(error) && error.code).toBe("validation");
    expect(isRepositoryError(error) && error.issues.some((i) => i.path === "title.uz")).toBe(true);
    expect((await repo.getById(draft.id))?.status).toBe("draft");
  });

  it("rejects a slug that is already used", async () => {
    const existing = (await repo.list())[0]!;
    await expect(repo.create({ ...complete, slug: existing.slug })).rejects.toMatchObject({ code: "slug_taken" });
  });

  it("drops unsafe image references on write", async () => {
    const created = await repo.create({
      ...complete,
      cover: "javascript:alert(1)",
      gallery: ["/demo/house-tree.jpg", "//evil.example/x.jpg", "local:img_ok", "data:image/png;base64,AA"],
    });
    expect(created.cover).toBeNull();
    expect(created.gallery).toEqual(["/demo/house-tree.jpg", "local:img_ok"]);
  });

  it("duplicate creates an unpublished, non-featured copy right after the original", async () => {
    const source = (await repo.list({ featured: true }))[0]!;
    const copy = await repo.duplicate(source.id);
    expect(copy.status).toBe("draft");
    expect(copy.featured).toBe(false);
    expect(copy.slug).toBe(`${source.slug}-copy`);
    expect(copy.title.ru).toContain("(копия)");
    const second = await repo.duplicate(source.id);
    expect(second.slug).toBe(`${source.slug}-copy-2`);
    const ids = (await repo.list()).map((p) => p.id);
    expect(ids.indexOf(second.id)).toBe(ids.indexOf(source.id) + 1);
  });

  it("featured flag and category changes are persisted", async () => {
    const p = (await repo.list({ featured: false, status: "published" }))[0]!;
    await repo.setFeatured(p.id, true);
    await repo.setCategory(p.id, "hospitality");
    const after = (await repo.getById(p.id))!;
    expect(after.featured).toBe(true);
    expect(after.category).toBe("hospitality");
  });

  it("reorder requires the complete list and persists the new order", async () => {
    const ids = (await repo.list()).map((p) => p.id);
    await expect(repo.reorder(ids.slice(1))).rejects.toMatchObject({ code: "validation" });
    await repo.reorder([...ids].reverse());
    expect((await repo.list()).map((p) => p.id)).toEqual([...ids].reverse());
  });

  it("search matches titles in every language and the slug", async () => {
    expect((await repo.list({ search: "дуб" })).length).toBe(1);
    expect((await repo.list({ search: "eman" })).length).toBe(1);
    expect((await repo.list({ search: "apartment-warm" })).length).toBe(1);
  });
});
