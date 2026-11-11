import type {
  ActivityAction,
  ActivityEntry,
  CategoryId,
  LocalizedText,
  MediaAsset,
  MediaRef,
  Project,
  ProjectInput,
  ProjectStatus,
  Service,
  ServiceInput,
  Settings,
  SettingsInput,
} from "@/lib/domain/types";
import type { Locale } from "@/lib/i18n/config";

/**
 * Repository contracts shared by the public site and the admin panel.
 *
 * Every method is async and every repository exposes `subscribe`, which
 * mirrors Firestore's `onSnapshot`. A Firebase implementation can satisfy
 * these interfaces without any UI changes.
 */

export type Unsubscribe = () => void;
export type Listener = () => void;

export interface Subscribable {
  subscribe(listener: Listener): Unsubscribe;
}

export interface ProjectQuery {
  status?: ProjectStatus;
  featured?: boolean;
  category?: CategoryId;
  /** Case-insensitive search across titles (all languages), locations and slug. */
  search?: string;
}

export interface ProjectRepository extends Subscribable {
  list(query?: ProjectQuery): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  /** Public lookup: returns only published projects. */
  getPublishedBySlug(slug: string): Promise<Project | null>;
  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
  create(input: ProjectInput): Promise<Project>;
  update(id: string, input: ProjectInput): Promise<Project>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<Project>;
  setStatus(id: string, status: ProjectStatus): Promise<Project>;
  setFeatured(id: string, featured: boolean): Promise<Project>;
  setCategory(id: string, category: CategoryId): Promise<Project>;
  /** Persist a new display order. `ids` is the full ordered list. */
  reorder(ids: string[]): Promise<void>;
  reset(): Promise<void>;
}

export interface ServiceQuery {
  visibleOnly?: boolean;
}

export interface ServiceRepository extends Subscribable {
  list(query?: ServiceQuery): Promise<Service[]>;
  getById(id: string): Promise<Service | null>;
  create(input: ServiceInput): Promise<Service>;
  update(id: string, input: ServiceInput): Promise<Service>;
  delete(id: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;
  reset(): Promise<void>;
}

export interface SettingsRepository extends Subscribable {
  get(): Promise<Settings>;
  update(input: SettingsInput): Promise<Settings>;
  reset(): Promise<void>;
}

export interface UploadOptions {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export type MediaStatus = "loading" | "ready" | "missing";

export interface MediaRepository extends Subscribable {
  /** Prepare stored media (e.g. restore local previews). Safe to call repeatedly. */
  init(): Promise<void>;
  list(): Promise<MediaAsset[]>;
  /** Rejects with `RepositoryError` code `invalid_file_type` or `file_too_large`. */
  validateFile(file: File): Promise<void>;
  upload(file: File, options?: UploadOptions): Promise<MediaAsset>;
  remove(id: string): Promise<void>;
  /** Synchronous lookup used while rendering. */
  resolve(ref: MediaRef): { url: string | null; status: MediaStatus };
  /** True when uploads survive a page reload in this browser. */
  readonly persistent: boolean;
  readonly maxFileSize: number;
  readonly acceptedTypes: readonly string[];
  reset(): Promise<void>;
}

export interface ActivityRepository extends Subscribable {
  list(limit?: number): Promise<ActivityEntry[]>;
  record(action: ActivityAction, entityId: string | null, label: LocalizedText | null): void;
  reset(): Promise<void>;
}

export interface Preferences {
  adminLocale: Locale;
  adminNoticeDismissed: boolean;
  projectsView: "grid" | "list";
}

export interface PreferencesRepository extends Subscribable {
  get(): Preferences;
  set(patch: Partial<Preferences>): void;
}

export interface Repositories {
  projects: ProjectRepository;
  services: ServiceRepository;
  settings: SettingsRepository;
  media: MediaRepository;
  activity: ActivityRepository;
  preferences: PreferencesRepository;
  /** True when structured data survives a reload (localStorage available). */
  readonly persistent: boolean;
}
