import { exampleSource, normalizeSource } from "../sourceModel";
import type { AltSource } from "../types";

const oldStorageKey = "alteditor.source.v1";
const storeKey = "alteditor.sources.v1";
const activeKey = "alteditor.activeSource";

export interface StoredSource {
  id: string;
  source: AltSource;
  lastModified: number;
}

export interface SourcesStore {
  sources: StoredSource[];
  activeId: string | null;
}

export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const generateId = (): string => crypto.randomUUID();

const isDefaultSeed = (source: AltSource): boolean =>
  source.name === exampleSource.name &&
  source.iconURL === exampleSource.iconURL &&
  source.apps.length === 0 &&
  source.news.length === 0;

const migrateFromV1 = (): SourcesStore | null => {
  try {
    const stored = localStorage.getItem(oldStorageKey);
    if (!stored) return null;
    const source = normalizeSource(JSON.parse(stored));
    if (isDefaultSeed(source)) return null;
    const id = generateId();
    localStorage.removeItem(oldStorageKey);
    return { sources: [{ id, source, lastModified: Date.now() }], activeId: id };
  } catch {
    return null;
  }
};

export const readSourcesStore = (): SourcesStore => {
  try {
    const activeId = localStorage.getItem(activeKey);
    const stored = localStorage.getItem(storeKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        sources: Array.isArray(parsed.sources)
          ? parsed.sources.map((s: Record<string, unknown>) => ({
              id: typeof s.id === "string" ? s.id : generateId(),
              source: normalizeSource(s.source),
              lastModified: typeof s.lastModified === "number" ? s.lastModified : Date.now(),
            }))
          : [],
        activeId,
      };
    }
  } catch {
    /* parse failed - fall through to migration */
  }

  const migrated = migrateFromV1();
  if (migrated) return migrated;
  return { sources: [], activeId: null };
};

export const writeSourcesStore = (store: SourcesStore) => {
  localStorage.setItem(storeKey, JSON.stringify(store));
  if (store.activeId) {
    localStorage.setItem(activeKey, store.activeId);
  } else {
    localStorage.removeItem(activeKey);
  }
};

export const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const toFileName = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "altsource"}.json`;
