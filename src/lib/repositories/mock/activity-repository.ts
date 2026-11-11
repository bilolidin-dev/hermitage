import { z } from "zod";
import { activitySchema, type ActivityAction, type ActivityEntry, type LocalizedText } from "@/lib/domain/types";
import type { ActivityRepository, Listener } from "../types";
import { clone, createId, nowIso, STORAGE_PREFIX, StoredDocument, type KeyValueStorage } from "./storage";

const MAX_ENTRIES = 60;

export class LocalActivityRepository implements ActivityRepository {
  private readonly doc: StoredDocument<ActivityEntry[]>;

  constructor(storage: KeyValueStorage) {
    this.doc = new StoredDocument(storage, `${STORAGE_PREFIX}activity`, z.array(activitySchema), () => [], activitySchema);
  }

  subscribe(listener: Listener) {
    return this.doc.subscribe(listener);
  }

  async list(limit = 20) {
    return clone(this.doc.read().slice(0, limit));
  }

  record(action: ActivityAction, entityId: string | null, label: LocalizedText | null) {
    const entry: ActivityEntry = { id: createId("act"), action, entityId, label, at: nowIso() };
    try {
      this.doc.write([entry, ...this.doc.read()].slice(0, MAX_ENTRIES));
    } catch {
      // The activity log is informational; never block the real action because of it.
    }
  }

  async reset() {
    this.doc.reset();
  }
}
