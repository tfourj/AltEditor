import { exampleSource, normalizeSource } from "../sourceModel";
import type { AltSource } from "../types";

export const storageKey = "alteditor.source.v1";

export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const isDefaultSeed = (source: AltSource): boolean =>
  source.name === exampleSource.name &&
  source.iconURL === exampleSource.iconURL &&
  source.apps.length === 0 &&
  source.news.length === 0;

export const readStoredSource = (): AltSource | null => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    const source = normalizeSource(JSON.parse(stored));
    return isDefaultSeed(source) ? null : source;
  } catch {
    return null;
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
