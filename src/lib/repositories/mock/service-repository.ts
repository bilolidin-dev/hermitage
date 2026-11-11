import { z } from "zod";
import { serviceSchema, type Service, type ServiceInput } from "@/lib/domain/types";
import { validateService } from "@/lib/domain/validation";
import { seedServices } from "@/lib/seed/services";
import { RepositoryError } from "../errors";
import type { ActivityRepository, Listener, ServiceQuery, ServiceRepository } from "../types";
import { clone, createId, latency, nowIso, STORAGE_PREFIX, StoredDocument, type KeyValueStorage } from "./storage";

function normalize(input: ServiceInput): ServiceInput {
  const trim = (t: ServiceInput["title"]) => ({ ru: t.ru.trim(), ky: t.ky.trim(), uz: t.uz.trim() });
  return { title: trim(input.title), description: trim(input.description), visible: input.visible };
}

export class LocalServiceRepository implements ServiceRepository {
  private readonly doc: StoredDocument<Service[]>;

  constructor(
    storage: KeyValueStorage,
    private readonly activity: ActivityRepository,
  ) {
    this.doc = new StoredDocument(storage, `${STORAGE_PREFIX}services`, z.array(serviceSchema), seedServices, serviceSchema);
  }

  subscribe(listener: Listener) {
    return this.doc.subscribe(listener);
  }

  private sorted() {
    return [...this.doc.read()].sort((a, b) => a.order - b.order);
  }

  private find(id: string) {
    const s = this.doc.read().find((x) => x.id === id);
    if (!s) throw new RepositoryError("not_found", `Service ${id} not found`);
    return s;
  }

  private assertValid(input: ServiceInput) {
    const issues = validateService(input);
    if (issues.length) throw new RepositoryError("validation", "Invalid service", issues);
  }

  async list(query: ServiceQuery = {}) {
    return clone(this.sorted().filter((s) => !query.visibleOnly || s.visible));
  }

  async getById(id: string) {
    const s = this.doc.read().find((x) => x.id === id);
    return s ? clone(s) : null;
  }

  async create(raw: ServiceInput) {
    await latency();
    const input = normalize(raw);
    this.assertValid(input);
    const now = nowIso();
    const service: Service = {
      ...input,
      id: createId("svc"),
      order: Math.max(-1, ...this.doc.read().map((s) => s.order)) + 1,
      createdAt: now,
      updatedAt: now,
    };
    this.doc.write([...this.doc.read(), service]);
    this.activity.record("service.created", service.id, service.title);
    return clone(service);
  }

  async update(id: string, raw: ServiceInput) {
    await latency();
    const current = this.find(id);
    const input = normalize(raw);
    this.assertValid(input);
    const next: Service = { ...current, ...input, updatedAt: nowIso() };
    this.doc.write(this.doc.read().map((s) => (s.id === id ? next : s)));
    this.activity.record("service.updated", id, next.title);
    return clone(next);
  }

  async delete(id: string) {
    await latency();
    const current = this.find(id);
    this.doc.write(this.doc.read().filter((s) => s.id !== id));
    this.activity.record("service.deleted", id, current.title);
  }

  async reorder(ids: string[]) {
    const all = this.doc.read();
    const position = new Map(ids.map((id, i) => [id, i]));
    if (ids.length !== all.length || all.some((s) => !position.has(s.id))) {
      throw new RepositoryError("validation", "Reorder requires the complete list of service ids");
    }
    this.doc.write(all.map((s) => ({ ...s, order: position.get(s.id) ?? s.order })));
    this.activity.record("service.reordered", null, null);
  }

  async reset() {
    this.doc.reset();
  }
}
