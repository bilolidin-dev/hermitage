"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type DependencyList } from "react";
import type { MediaRef } from "@/lib/domain/types";
import { getRepositories, type MediaStatus, type Preferences, type Repositories } from "@/lib/repositories";
import { DEFAULT_PREFERENCES } from "@/lib/repositories/mock/preferences-repository";

type Source = "projects" | "services" | "settings" | "media" | "activity";

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
}

/**
 * In-memory snapshot cache used only after initial client hydration so
 * client-side route transitions render cached repository data immediately
 * without flashing loading skeletons or blank screens.
 */
let clientHydrated = false;
const queryCache = new Map<string, unknown>();

/**
 * Runs a repository query on the client and re-runs it whenever one of the
 * listed repositories reports a change (like a Firestore snapshot listener).
 * Server render and first client render both start in the loading state,
 * so there are no hydration mismatches.
 */
export function useQuery<T>(
  run: (r: Repositories) => Promise<T>,
  sources: Source[],
  deps: DependencyList = [],
  cacheKey?: string,
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>(() => {
    if (clientHydrated && cacheKey && queryCache.has(cacheKey)) {
      return { data: queryCache.get(cacheKey) as T, loading: false, error: null };
    }
    return { data: undefined, loading: true, error: null };
  });
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    clientHydrated = true;
    const repos = getRepositories();
    let active = true;
    let seq = 0;
    const load = () => {
      const id = ++seq;
      setState((s) => (s.data !== undefined ? s : s.loading ? s : { ...s, loading: true }));
      runRef.current(repos).then(
        (data) => {
          if (cacheKey) queryCache.set(cacheKey, data);
          if (active && id === seq) setState({ data, loading: false, error: null });
        },
        (error: unknown) => active && id === seq && setState((s) => ({ ...s, loading: false, error })),
      );
    };
    load();
    const unsubscribe = sources.map((s) =>
      repos[s].subscribe(() => {
        if (cacheKey) queryCache.delete(cacheKey);
        load();
      }),
    );
    return () => {
      active = false;
      unsubscribe.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export const usePublishedProjects = () =>
  useQuery((r) => r.projects.list({ status: "published" }), ["projects"], [], "published-projects");

export const useVisibleServices = () =>
  useQuery((r) => r.services.list({ visibleOnly: true }), ["services"], [], "visible-services");

export const useSettings = () =>
  useQuery((r) => r.settings.get(), ["settings"], [], "settings");

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

const noop = () => () => {};

/** Resolve an image reference to a displayable URL. */
export function useMediaUrl(ref: MediaRef | null | undefined): { url: string | null; status: MediaStatus } {
  const isLocal = !!ref && ref.startsWith("local:");

  useEffect(() => {
    if (isLocal) void getRepositories().media.init();
  }, [isLocal]);

  const snapshot = useSyncExternalStore(
    isLocal ? (cb) => getRepositories().media.subscribe(cb) : noop,
    () => {
      if (!ref) return "missing|";
      const r = getRepositories().media.resolve(ref);
      return `${r.status}|${r.url ?? ""}`;
    },
    () => (!ref ? "missing|" : isLocal ? "loading|" : `ready|${ref}`),
  );
  const sep = snapshot.indexOf("|");
  const status = snapshot.slice(0, sep) as MediaStatus;
  const url = snapshot.slice(sep + 1) || null;
  return { url, status };
}

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

export function usePreferences(): [Preferences, (patch: Partial<Preferences>) => void] {
  const prefs = useSyncExternalStore(
    (cb) => getRepositories().preferences.subscribe(cb),
    () => getRepositories().preferences.get(),
    () => DEFAULT_PREFERENCES,
  );
  return [prefs, (patch) => getRepositories().preferences.set(patch)];
}
