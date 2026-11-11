import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { StoredDocument, type KeyValueStorage } from "./storage";

function memory(initial: Record<string, string> = {}): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    persistent: true,
    map,
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

const item = z.object({ id: z.string(), n: z.number() });
const list = z.array(item);
const seed = () => [{ id: "seed", n: 0 }];

afterEach(() => vi.restoreAllMocks());

describe("StoredDocument hydration", () => {
  it("returns stored data when it is valid", () => {
    const storage = memory({ k: JSON.stringify([{ id: "a", n: 1 }]) });
    expect(new StoredDocument(storage, "k", list, seed, item).read()).toEqual([{ id: "a", n: 1 }]);
  });

  it("seeds an empty store and persists the seed", () => {
    const storage = memory();
    expect(new StoredDocument(storage, "k", list, seed, item).read()).toEqual(seed());
    expect(JSON.parse(storage.map.get("k")!)).toEqual(seed());
  });

  it("keeps valid items, drops invalid ones and backs up the original", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = JSON.stringify([{ id: "a", n: 1 }, { id: "broken" }, { id: "b", n: 2 }]);
    const storage = memory({ k: raw });
    const doc = new StoredDocument(storage, "k", list, seed, item);
    expect(doc.read()).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 2 },
    ]);
    expect(storage.map.get("k.recovered")).toBe(raw);
    expect(JSON.parse(storage.map.get("k")!)).toHaveLength(2);
  });

  it("falls back to the seed when every item is invalid (no silent empty list)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = JSON.stringify([{ id: 1 }, { nope: true }]);
    const storage = memory({ k: raw });
    expect(new StoredDocument(storage, "k", list, seed, item).read()).toEqual(seed());
    expect(storage.map.get("k.recovered")).toBe(raw);
  });

  it("keeps a legitimately empty collection", () => {
    const storage = memory({ k: "[]" });
    expect(new StoredDocument(storage, "k", list, seed, item).read()).toEqual([]);
  });

  it("falls back to the seed on invalid JSON and keeps a copy", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = memory({ k: "{not json" });
    expect(new StoredDocument(storage, "k", list, seed, item).read()).toEqual(seed());
    expect(storage.map.get("k.recovered")).toBe("{not json");
  });

  it("falls back to the seed for an invalid single document and keeps a copy", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = JSON.stringify({ wrong: true });
    const storage = memory({ k: raw });
    const doc = new StoredDocument(storage, "k", z.object({ name: z.string() }), () => ({ name: "seed" }));
    expect(doc.read()).toEqual({ name: "seed" });
    expect(storage.map.get("k.recovered")).toBe(raw);
  });

  it("write persists, updates the cache and notifies subscribers", () => {
    const storage = memory();
    const doc = new StoredDocument(storage, "k", list, seed, item);
    const listener = vi.fn();
    doc.subscribe(listener);
    doc.write([{ id: "x", n: 9 }]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.map.get("k")!)).toEqual([{ id: "x", n: 9 }]);
    expect(doc.read()).toEqual([{ id: "x", n: 9 }]);
  });

  it("a failing write surfaces the error and leaves the cache unchanged", () => {
    const storage = memory();
    const doc = new StoredDocument(storage, "k", list, seed, item);
    doc.read();
    storage.set = () => {
      throw new Error("quota");
    };
    expect(() => doc.write([{ id: "x", n: 1 }])).toThrow("quota");
    expect(doc.read()).toEqual(seed());
  });

  it("reset restores the seed", () => {
    const storage = memory({ k: JSON.stringify([{ id: "a", n: 1 }]) });
    const doc = new StoredDocument(storage, "k", list, seed, item);
    doc.read();
    doc.reset();
    expect(doc.read()).toEqual(seed());
  });
});
