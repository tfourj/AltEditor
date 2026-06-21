import type { AltVersion } from "./types";

const versionFormats = (version: string): string[] =>
  [...new Set([version, version.replace(/\./g, "_"), version.replace(/\./g, "-"), version.replace(/\./g, "")])].filter(Boolean);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const suggestDownloadUrl = (versions: AltVersion[], scannedVersion: string): string | null => {
  if (!scannedVersion.trim()) return null;

  for (const version of versions) {
    if (!version.downloadURL.trim() || !version.version.trim()) continue;

    for (const currentFormat of versionFormats(version.version)) {
      const replacementFormat = versionFormats(scannedVersion)[versionFormats(version.version).indexOf(currentFormat)];
      if (!replacementFormat) continue;

      const pattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(currentFormat)}(?=$|[^A-Za-z0-9])`);
      if (!pattern.test(version.downloadURL)) continue;

      return version.downloadURL.replace(pattern, (_match, prefix: string) => `${prefix}${replacementFormat}`);
    }
  }

  return null;
};
