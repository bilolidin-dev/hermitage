import { z } from "zod";
import { LOCALES } from "@/lib/i18n/config";
import type { Listener, Preferences, PreferencesRepository } from "../types";
import { STORAGE_PREFIX, StoredDocument, type KeyValueStorage } from "./storage";

const schema = z.object({
  adminLocale: z.enum(LOCALES),
  adminNoticeDismissed: z.boolean(),
  projectsView: z.enum(["grid", "list"]),
});

export const DEFAULT_PREFERENCES: Preferences = {
  adminLocale: "ru",
  adminNoticeDismissed: false,
  projectsView: "grid",
};

/** Per-browser interface preferences. Not content, so it is never reset with demo data. */
export class LocalPreferencesRepository implements PreferencesRepository {
  private readonly doc: StoredDocument<Preferences>;

  constructor(storage: KeyValueStorage) {
    this.doc = new StoredDocument(storage, `${STORAGE_PREFIX}preferences`, schema, () => ({ ...DEFAULT_PREFERENCES }));
  }

  subscribe(listener: Listener) {
    return this.doc.subscribe(listener);
  }

  get() {
    return this.doc.read();
  }

  set(patch: Partial<Preferences>) {
    try {
      this.doc.write({ ...this.doc.read(), ...patch });
    } catch {
      /* preferences are optional */
    }
  }
}
