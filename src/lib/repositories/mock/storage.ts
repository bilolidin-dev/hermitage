import type { z } from "zod";
import { RepositoryError } from "../errors";
import type { Listener, Unsubscribe } from "../types";

/**
 * Thin key-value layer over localStorage. Falls back to memory when
 * localStorage is blocked (private mode, disabled storage, SSR), so the
 * prototype keeps working — it just won't survive a reload.
 */
export interface KeyValueStorage {
  readonly persistent: boolean;
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export const STORAGE_PREFIX = "hermitage.demo.v1.";

function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    persistent: false,
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

export function createBrowserStorage(): KeyValueStorage {
  if (typeof window === "undefined") return createMemoryStorage();
  try {
    const probe = `${STORAGE_PREFIX}__probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch {
    return createMemoryStorage();
  }
  return {
    persistent: true,
    get: (k) => {
      try {
        return window.localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set: (k, v) => {
      try {
        window.localStorage.setItem(k, v);
      } catch (error) {
        const quota =
          error instanceof DOMException &&
          (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
        throw new RepositoryError(quota ? "quota_exceeded" : "storage_unavailable");
      }
    },
    remove: (k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
}

/** Minimal event emitter used by every mock repository. */
export class Emitter {
  private listeners = new Set<Listener>();
  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit() {
    for (const l of [...this.listeners]) l();
  }
}

/** Re-emit when another tab changes the same key (keeps admin and site tabs in sync). */
function watchOtherTabs(key: string, onChange: () => void) {
  if (typeof window === "undefined") return;
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) onChange();
  });
}

/**
 * A validated JSON document stored under one key.
 *
 * Hydration is defensive:
 *  - valid data is used as is;
 *  - for collections (`itemSchema` given), invalid items are dropped and the
 *    valid ones kept, instead of discarding the editor's work;
 *  - otherwise the seed is restored.
 * Before anything is discarded, the raw value is copied to `<key>.recovered`
 * so nothing is lost silently.
 */
export class StoredDocument<T> {
  private cache: T | null = null;
  private readonly emitter = new Emitter();

  constructor(
    private readonly storage: KeyValueStorage,
    readonly key: string,
    private readonly schema: z.ZodType<T>,
    private readonly seed: () => T,
    private readonly itemSchema?: z.ZodType<unknown>,
  ) {
    watchOtherTabs(key, () => {
      this.cache = null;
      this.emitter.emit();
    });
  }

  private backup(raw: string) {
    try {
      this.storage.set(`${this.key}.recovered`, raw);
    } catch {
      /* best effort */
    }
  }

  private persist(value: T) {
    try {
      this.storage.set(this.key, JSON.stringify(value));
    } catch {
      /* keep working in memory */
    }
  }

  read(): T {
    if (this.cache !== null) return this.cache;
    const raw = this.storage.get(this.key);
    if (raw !== null) {
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        json = undefined;
        console.warn(`[demo-data] "${this.key}" contained invalid JSON. A copy was kept in "${this.key}.recovered".`);
      }
      if (json !== undefined) {
        const parsed = this.schema.safeParse(json);
        if (parsed.success) {
          this.cache = parsed.data;
          return this.cache;
        }
        if (this.itemSchema && Array.isArray(json)) {
          const items = json.filter((item) => this.itemSchema!.safeParse(item).success);
          const salvaged = this.schema.safeParse(items);
          // If nothing survives, the data is unusable: restore the seed instead of an empty list.
          if (salvaged.success && (items.length > 0 || json.length === 0)) {
            this.backup(raw);
            console.warn(
              `[demo-data] "${this.key}": ${json.length - items.length} invalid item(s) skipped. Original kept in "${this.key}.recovered".`,
            );
            this.cache = salvaged.data;
            this.persist(salvaged.data);
            return salvaged.data;
          }
        }
        console.warn(`[demo-data] "${this.key}" failed validation and was restored from seed data. Original kept in "${this.key}.recovered".`);
      }
      this.backup(raw);
    }
    const seeded = this.seed();
    this.cache = seeded;
    this.persist(seeded);
    return seeded;
  }

  write(next: T) {
    this.storage.set(this.key, JSON.stringify(next)); // throws RepositoryError on failure
    this.cache = next;
    this.emitter.emit();
  }

  reset() {
    this.storage.remove(this.key);
    this.cache = null;
    this.read();
    this.emitter.emit();
  }

  subscribe(listener: Listener): Unsubscribe {
    return this.emitter.subscribe(listener);
  }
}

export const nowIso = () => new Date().toISOString();

export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

/** Small artificial delay so loading and saving states are visible, like a network call. */
export const latency = (ms = 220) => new Promise<void>((r) => setTimeout(r, ms));

export const clone = <T,>(value: T): T => structuredClone(value);
