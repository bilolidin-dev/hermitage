import { ACCEPTED_IMAGE_TYPES, detectImageType, MAX_IMAGE_BYTES } from "@/lib/domain/media";
import type { MediaAsset, MediaRef } from "@/lib/domain/types";
import { DEMO_MEDIA } from "@/lib/seed/demo-media";
import { RepositoryError } from "../errors";
import type { ActivityRepository, Listener, MediaRepository, MediaStatus, UploadOptions } from "../types";
import { createId, Emitter, nowIso } from "./storage";

/**
 * Local media for the demo.
 *
 * Files never leave the browser: they are kept in IndexedDB and shown through
 * temporary object URLs (`URL.createObjectURL`). Nothing is uploaded to a
 * server. Clearing site data removes them. If IndexedDB is unavailable, files
 * live only in memory until the tab is closed.
 *
 * A Firebase implementation would upload to Cloud Storage in `upload()` and
 * return `https://` refs, which `resolve()` passes through unchanged.
 */

const DB_NAME = "hermitage-demo-media";
const STORE = "files";
const LOCAL_PREFIX = "local:";

interface StoredFile {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDimensions(file: Blob): Promise<{ width: number | null; height: number | null }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class BrowserMediaRepository implements MediaRepository {
  readonly maxFileSize = MAX_IMAGE_BYTES;
  readonly acceptedTypes = ACCEPTED_IMAGE_TYPES;
  persistent = false;

  private db: IDBDatabase | null = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private readonly local = new Map<string, { asset: MediaAsset; url: string }>();
  private readonly emitter = new Emitter();

  constructor(private readonly activity: ActivityRepository) {}

  subscribe(listener: Listener) {
    return this.emitter.subscribe(listener);
  }

  init() {
    if (typeof window === "undefined") return Promise.resolve();
    this.initPromise ??= (async () => {
      try {
        this.db = await openDb();
        const files = await tx<StoredFile[]>(this.db, "readonly", (s) => s.getAll() as IDBRequest<StoredFile[]>);
        for (const f of files) this.register(f);
        this.persistent = true;
      } catch {
        this.db = null;
        this.persistent = false;
      }
      this.ready = true;
      this.emitter.emit();
    })();
    return this.initPromise;
  }

  private register(f: StoredFile) {
    const asset: MediaAsset = {
      id: f.id,
      ref: `${LOCAL_PREFIX}${f.id}`,
      name: f.name,
      type: f.type,
      size: f.size,
      width: f.width,
      height: f.height,
      source: "local",
      createdAt: f.createdAt,
    };
    this.local.set(f.id, { asset, url: URL.createObjectURL(f.blob) });
    return asset;
  }

  resolve(ref: MediaRef): { url: string | null; status: MediaStatus } {
    if (!ref.startsWith(LOCAL_PREFIX)) return { url: ref, status: "ready" };
    if (!this.ready) return { url: null, status: "loading" };
    const entry = this.local.get(ref.slice(LOCAL_PREFIX.length));
    return entry ? { url: entry.url, status: "ready" } : { url: null, status: "missing" };
  }

  async list() {
    await this.init();
    const local = [...this.local.values()]
      .map((e) => e.asset)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return [...local, ...DEMO_MEDIA];
  }

  /**
   * Checks size, declared type and the file's real signature (first bytes).
   * A renamed or disguised file is rejected even if its extension looks right.
   */
  async validateFile(file: File) {
    if (file.size > this.maxFileSize) throw new RepositoryError("file_too_large", file.name);
    if (!(this.acceptedTypes as readonly string[]).includes(file.type)) {
      throw new RepositoryError("invalid_file_type", file.name);
    }
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    if (detectImageType(head) === null) throw new RepositoryError("invalid_file_type", file.name);
  }

  async upload(file: File, options: UploadOptions = {}) {
    await this.validateFile(file);
    await this.init();

    // Simulated transfer so the interface can show real progress feedback.
    const duration = Math.min(2200, 650 + file.size / 4000);
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      if (options.signal?.aborted) throw new RepositoryError("upload_aborted", file.name);
      await wait(duration / steps);
      options.onProgress?.(Math.min(0.96, 1 - Math.pow(1 - i / steps, 2)));
    }

    // The browser must be able to decode it; otherwise it is not a usable image.
    const dims = await readDimensions(file);
    if (dims.width === null) throw new RepositoryError("invalid_file_type", file.name);
    const stored: StoredFile = {
      id: createId("img"),
      blob: file,
      name: file.name,
      type: file.type,
      size: file.size,
      ...dims,
      createdAt: nowIso(),
    };
    if (this.db) {
      try {
        await tx(this.db, "readwrite", (s) => s.put(stored));
      } catch (error) {
        const quota = error instanceof DOMException && error.name === "QuotaExceededError";
        throw new RepositoryError(quota ? "quota_exceeded" : "storage_unavailable", file.name);
      }
    }
    const asset = this.register(stored);
    options.onProgress?.(1);
    this.activity.record("media.uploaded", asset.id, { ru: asset.name, ky: asset.name, uz: asset.name });
    this.emitter.emit();
    return asset;
  }

  async remove(id: string) {
    await this.init();
    const entry = this.local.get(id);
    if (!entry) throw new RepositoryError("not_found", id);
    if (this.db) await tx(this.db, "readwrite", (s) => s.delete(id));
    URL.revokeObjectURL(entry.url);
    this.local.delete(id);
    this.activity.record("media.deleted", id, { ru: entry.asset.name, ky: entry.asset.name, uz: entry.asset.name });
    this.emitter.emit();
  }

  async reset() {
    await this.init();
    if (this.db) await tx(this.db, "readwrite", (s) => s.clear());
    for (const e of this.local.values()) URL.revokeObjectURL(e.url);
    this.local.clear();
    this.emitter.emit();
  }
}

export const isLocalRef = (ref: string) => ref.startsWith(LOCAL_PREFIX);
