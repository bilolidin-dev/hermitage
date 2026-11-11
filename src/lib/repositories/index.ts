import { LocalActivityRepository } from "./mock/activity-repository";
import { BrowserMediaRepository } from "./mock/media-repository";
import { LocalPreferencesRepository } from "./mock/preferences-repository";
import { LocalProjectRepository } from "./mock/project-repository";
import { LocalServiceRepository } from "./mock/service-repository";
import { LocalSettingsRepository } from "./mock/settings-repository";
import { createBrowserStorage } from "./mock/storage";
import type { Repositories } from "./types";

/**
 * The single place where repository implementations are chosen.
 *
 * To move to Firebase, write `createFirebaseRepositories()` that returns the
 * same `Repositories` shape and return it here. UI code only talks to these
 * interfaces, never to localStorage or IndexedDB directly.
 */
function createMockRepositories(): Repositories {
  const storage = createBrowserStorage();
  const activity = new LocalActivityRepository(storage);
  return {
    projects: new LocalProjectRepository(storage, activity),
    services: new LocalServiceRepository(storage, activity),
    settings: new LocalSettingsRepository(storage, activity),
    media: new BrowserMediaRepository(activity),
    activity,
    preferences: new LocalPreferencesRepository(storage),
    persistent: storage.persistent,
  };
}

let instance: Repositories | null = null;

/** Lazily created so nothing touches browser storage during server rendering. */
export function getRepositories(): Repositories {
  if (typeof window === "undefined") {
    // Server render: a throwaway in-memory instance (pages read data on the client).
    return createMockRepositories();
  }
  instance ??= createMockRepositories();
  return instance;
}

/**
 * Restore every content repository to the original demo dataset.
 * Accepts the repositories to reset (defaults to the app instance), which
 * keeps the function usable outside the browser, e.g. in unit tests.
 */
export async function resetDemoData(r: Repositories = getRepositories()): Promise<void> {
  await Promise.all([r.projects.reset(), r.services.reset(), r.settings.reset(), r.media.reset()]);
  await r.activity.reset();
  r.activity.record("demo.reset", null, null);
}

export type * from "./types";
export { RepositoryError, isRepositoryError, errorCode } from "./errors";
