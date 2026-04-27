import JSZip from "jszip";
import { parse } from "plist";

import type { AltApp, AltVersion } from "./types";
import { makeApp, makeVersion } from "./sourceModel";

interface InfoPlist {
  CFBundleDisplayName?: string;
  CFBundleName?: string;
  CFBundleIdentifier?: string;
  CFBundleShortVersionString?: string;
  CFBundleVersion?: string;
  ALTMarketplaceID?: string;
  MarketplaceID?: string;
  marketplaceID?: string;
  LSMinimumSystemVersion?: string;
  MinimumOSVersion?: string;
  NSPhotoLibraryUsageDescription?: string;
  NSCameraUsageDescription?: string;
  NSMicrophoneUsageDescription?: string;
  [key: string]: unknown;
}

interface AdpVariant {
  assetPath?: string;
  variantDetails?: {
    compressedSize?: number;
    uncompressedSize?: number;
  };
}

interface AdpManifest {
  appleItemId?: string;
  bundleId?: string;
  shortVersionString?: string;
  bundleVersion?: string;
  minimumSystemVersions?: Record<string, string>;
  variants?: AdpVariant[];
}

const decodeMaybeXmlPlist = async (file: JSZip.JSZipObject): Promise<InfoPlist | null> => {
  const bytes = await file.async("uint8array");
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const text = decoder.decode(bytes);
  if (!text.includes("<plist")) return null;
  const parsed = parse(text) as unknown;
  return parsed && typeof parsed === "object" ? (parsed as InfoPlist) : null;
};

const privacyKeys = [
  "NSPhotoLibraryUsageDescription",
  "NSCameraUsageDescription",
  "NSMicrophoneUsageDescription",
  "NSLocationWhenInUseUsageDescription",
  "NSLocationAlwaysAndWhenInUseUsageDescription",
  "NSBluetoothAlwaysUsageDescription",
  "NSCalendarsUsageDescription",
  "NSContactsUsageDescription",
];

const titleFromBundleId = (bundleId: string): string => {
  const parts = bundleId.split(".").filter(Boolean);
  const rawName = parts[parts.length - 1] ?? "Imported App";
  return rawName
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
};

const appFromAdpManifest = (manifest: AdpManifest): AltApp => {
  const bundleIdentifier = String(manifest.bundleId ?? "");
  const firstVariant = manifest.variants?.[0];
  const size = firstVariant?.variantDetails?.compressedSize ?? 0;

  const version: AltVersion = {
    ...makeVersion(),
    version: String(manifest.shortVersionString ?? ""),
    buildVersion: String(manifest.bundleVersion ?? ""),
    date: new Date().toISOString(),
    downloadURL: "manifest.json",
    size,
    minOSVersion: String(manifest.minimumSystemVersions?.ios ?? ""),
  };

  return {
    ...makeApp(),
    name: titleFromBundleId(bundleIdentifier),
    bundleIdentifier,
    marketplaceID: String(manifest.appleItemId ?? ""),
    developerName: "",
    localizedDescription: "",
    versions: [version],
  };
};

export const scanArchiveForApp = async (file: File): Promise<AltApp> => {
  const zip = await JSZip.loadAsync(file);
  const manifestFile = Object.values(zip.files).find((entry) => /(^|\/)manifest\.json$/i.test(entry.name));
  if (manifestFile) {
    const manifest = JSON.parse(await manifestFile.async("text")) as AdpManifest;
    return appFromAdpManifest(manifest);
  }

  const infoFile = Object.values(zip.files).find((entry) => /Payload\/[^/]+\.app\/Info\.plist$/i.test(entry.name) || /Info\.plist$/i.test(entry.name));
  if (!infoFile) throw new Error("No ADP manifest.json or IPA Info.plist found in archive.");

  const info = await decodeMaybeXmlPlist(infoFile);
  if (!info) throw new Error("Info.plist is binary or unsupported. XML plists can be scanned in the browser.");

  const version: AltVersion = {
    ...makeVersion(),
    version: String(info.CFBundleShortVersionString ?? ""),
    buildVersion: String(info.CFBundleVersion ?? ""),
    date: new Date().toISOString(),
    downloadURL: "",
    size: file.size,
    minOSVersion: String(info.MinimumOSVersion ?? info.LSMinimumSystemVersion ?? ""),
  };

  const app: AltApp = {
    ...makeApp(),
    name: String(info.CFBundleDisplayName ?? info.CFBundleName ?? "Imported App"),
    bundleIdentifier: String(info.CFBundleIdentifier ?? ""),
    marketplaceID: String(info.ALTMarketplaceID ?? info.MarketplaceID ?? info.marketplaceID ?? ""),
    developerName: "",
    localizedDescription: "",
    versions: [version],
    appPermissions: {
      entitlements: [],
      privacy: Object.fromEntries(
        privacyKeys
          .filter((key) => typeof info[key] === "string")
          .map((key) => [key, String(info[key])]),
      ),
    },
  };

  return app;
};
