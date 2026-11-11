import { z } from "zod";
import {
  projectSchema,
  type CategoryId,
  type LocalizedText,
  type Project,
  type ProjectInput,
  type ProjectStatus,
  toProjectInput,
} from "@/lib/domain/types";
import { isValidMediaRef } from "@/lib/domain/media";
import { validateProject } from "@/lib/domain/validation";
import { LOCALES } from "@/lib/i18n/config";
import { seedProjects } from "@/lib/seed/projects";
import { RepositoryError } from "../errors";
import type { ActivityRepository, Listener, ProjectQuery, ProjectRepository } from "../types";
import { clone, createId, latency, nowIso, STORAGE_PREFIX, StoredDocument, type KeyValueStorage } from "./storage";

const trimLocalized = (t: LocalizedText): LocalizedText => ({ ru: t.ru.trim(), ky: t.ky.trim(), uz: t.uz.trim() });

function normalize(input: ProjectInput): ProjectInput {
  return {
    ...input,
    slug: input.slug.trim().toLowerCase(),
    title: trimLocalized(input.title),
    location: trimLocalized(input.location),
    description: {
      ru: input.description.ru.trim(),
      ky: input.description.ky.trim(),
      uz: input.description.uz.trim(),
    },
    // Only allowed image references are stored (see isValidMediaRef).
    cover: isValidMediaRef(input.cover) ? input.cover : null,
    gallery: input.gallery.filter(isValidMediaRef),
  };
}

const COPY_SUFFIX: LocalizedText = { ru: "копия", ky: "көчүрмө", uz: "nusxa" };

export class LocalProjectRepository implements ProjectRepository {
  private readonly doc: StoredDocument<Project[]>;

  constructor(
    storage: KeyValueStorage,
    private readonly activity: ActivityRepository,
  ) {
    this.doc = new StoredDocument(storage, `${STORAGE_PREFIX}projects`, z.array(projectSchema), seedProjects, projectSchema);
  }

  subscribe(listener: Listener) {
    return this.doc.subscribe(listener);
  }

  private sorted(): Project[] {
    return [...this.doc.read()].sort((a, b) => a.order - b.order);
  }

  private find(id: string): Project {
    const project = this.doc.read().find((p) => p.id === id);
    if (!project) throw new RepositoryError("not_found", `Project ${id} not found`);
    return project;
  }

  private assertValid(input: ProjectInput, exceptId?: string) {
    const issues = validateProject(input);
    if (input.slug && this.doc.read().some((p) => p.slug === input.slug && p.id !== exceptId)) {
      issues.push({ path: "slug", code: "slugTaken" });
    }
    if (issues.length) {
      const slugTaken = issues.length === 1 && issues[0]?.code === "slugTaken";
      throw new RepositoryError(slugTaken ? "slug_taken" : "validation", "Invalid project", issues);
    }
  }

  private replace(next: Project) {
    this.doc.write(this.doc.read().map((p) => (p.id === next.id ? next : p)));
  }

  async list(query: ProjectQuery = {}) {
    const term = query.search?.trim().toLowerCase();
    const rows = this.sorted().filter((p) => {
      if (query.status && p.status !== query.status) return false;
      if (query.featured !== undefined && p.featured !== query.featured) return false;
      if (query.category && p.category !== query.category) return false;
      if (term) {
        const haystack = [p.slug, ...LOCALES.flatMap((l) => [p.title[l], p.location[l]])].join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    return clone(rows);
  }

  async getById(id: string) {
    const p = this.doc.read().find((x) => x.id === id);
    return p ? clone(p) : null;
  }

  async getPublishedBySlug(slug: string) {
    const p = this.doc.read().find((x) => x.slug === slug && x.status === "published");
    return p ? clone(p) : null;
  }

  async isSlugAvailable(slug: string, exceptId?: string) {
    return !this.doc.read().some((p) => p.slug === slug && p.id !== exceptId);
  }

  async create(raw: ProjectInput) {
    await latency();
    const input = normalize(raw);
    this.assertValid(input);
    const now = nowIso();
    const project: Project = {
      ...input,
      id: createId("prj"),
      // New projects open the portfolio; the order can be changed afterwards.
      order: Math.min(0, ...this.doc.read().map((p) => p.order)) - 1,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
      publishedAt: input.status === "published" ? now : null,
    };
    this.doc.write([...this.doc.read(), project]);
    this.activity.record("project.created", project.id, project.title);
    if (project.status === "published") this.activity.record("project.published", project.id, project.title);
    return clone(project);
  }

  async update(id: string, raw: ProjectInput) {
    await latency();
    const current = this.find(id);
    const input = normalize(raw);
    this.assertValid(input, id);
    const now = nowIso();
    const next: Project = {
      ...current,
      ...input,
      updatedAt: now,
      publishedAt:
        input.status === "published" ? (current.status === "published" ? current.publishedAt : now) : null,
    };
    this.replace(next);
    this.activity.record("project.updated", id, next.title);
    if (current.status !== next.status) {
      this.activity.record(next.status === "published" ? "project.published" : "project.unpublished", id, next.title);
    }
    return clone(next);
  }

  async delete(id: string) {
    await latency();
    const current = this.find(id);
    this.doc.write(this.doc.read().filter((p) => p.id !== id));
    this.activity.record("project.deleted", id, current.title);
  }

  async duplicate(id: string) {
    await latency();
    const source = this.find(id);
    let slug = `${source.slug}-copy`.slice(0, 74);
    for (let n = 2; this.doc.read().some((p) => p.slug === slug); n++) slug = `${source.slug}-copy-${n}`.slice(0, 80);
    const title = { ...source.title };
    for (const l of LOCALES) if (title[l]) title[l] = `${title[l]} (${COPY_SUFFIX[l]})`;
    const now = nowIso();
    // Insert directly after the original and shift the rest.
    const ordered = this.sorted();
    const index = ordered.findIndex((p) => p.id === id);
    const copy: Project = {
      ...clone(source),
      id: createId("prj"),
      slug,
      title,
      featured: false,
      status: "draft",
      isDemo: source.isDemo,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };
    ordered.splice(index + 1, 0, copy);
    this.doc.write(ordered.map((p, order) => ({ ...p, order })));
    this.activity.record("project.duplicated", copy.id, source.title);
    return clone({ ...copy, order: index + 1 });
  }

  async setStatus(id: string, status: ProjectStatus) {
    const current = this.find(id);
    if (current.status === status) return clone(current);
    return this.update(id, { ...toProjectInput(current), status });
  }

  async setFeatured(id: string, featured: boolean) {
    await latency(120);
    const current = this.find(id);
    const next = { ...current, featured, updatedAt: nowIso() };
    this.replace(next);
    this.activity.record(featured ? "project.featured" : "project.unfeatured", id, next.title);
    return clone(next);
  }

  async setCategory(id: string, category: CategoryId) {
    await latency(120);
    const current = this.find(id);
    const next = { ...current, category, updatedAt: nowIso() };
    this.replace(next);
    this.activity.record("project.updated", id, next.title);
    return clone(next);
  }

  async reorder(ids: string[]) {
    const all = this.doc.read();
    const position = new Map(ids.map((id, i) => [id, i]));
    if (ids.length !== all.length || all.some((p) => !position.has(p.id))) {
      throw new RepositoryError("validation", "Reorder requires the complete list of project ids");
    }
    this.doc.write(all.map((p) => ({ ...p, order: position.get(p.id) ?? p.order })));
    this.activity.record("project.reordered", null, null);
  }

  async reset() {
    this.doc.reset();
  }
}
