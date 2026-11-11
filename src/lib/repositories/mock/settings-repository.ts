import { settingsSchema, type Settings, type SettingsInput } from "@/lib/domain/types";
import { isValidMediaRef } from "@/lib/domain/media";
import { normalizePhone, validateSettings } from "@/lib/domain/validation";
import { seedSettings } from "@/lib/seed/settings";
import { RepositoryError } from "../errors";
import type { ActivityRepository, Listener, SettingsRepository } from "../types";
import { clone, latency, nowIso, STORAGE_PREFIX, StoredDocument, type KeyValueStorage } from "./storage";

export class LocalSettingsRepository implements SettingsRepository {
  private readonly doc: StoredDocument<Settings>;

  constructor(
    storage: KeyValueStorage,
    private readonly activity: ActivityRepository,
  ) {
    this.doc = new StoredDocument(storage, `${STORAGE_PREFIX}settings`, settingsSchema, seedSettings);
  }

  subscribe(listener: Listener) {
    return this.doc.subscribe(listener);
  }

  async get() {
    return clone(this.doc.read());
  }

  async update(raw: SettingsInput) {
    await latency();
    const input: SettingsInput = {
      ...raw,
      studioName: raw.studioName.trim(),
      whatsapp: normalizePhone(raw.whatsapp),
      instagram: raw.instagram.trim(),
      logo: isValidMediaRef(raw.logo) ? raw.logo : null,
    };
    const issues = validateSettings(input);
    if (issues.length) throw new RepositoryError("validation", "Invalid settings", issues);
    const next: Settings = { ...input, updatedAt: nowIso() };
    this.doc.write(next);
    this.activity.record("settings.updated", null, null);
    return clone(next);
  }

  async reset() {
    this.doc.reset();
  }
}
