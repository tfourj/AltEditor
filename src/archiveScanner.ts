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
  LSMinimumSystemVersion?: string;
  MinimumOSVersion?: string;
  NSPhotoLibraryUsageDescription?: string;
  NSCameraUsageDescription?: string;
  NSMicrophoneUsageDescription?: string;
  [key: string]: unknown;
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

export const scanArchiveForApp = async (file: File): Promise<AltApp> => {
  const zip = await JSZip.loadAsync(file);
  const infoFile = Object.values(zip.files).find((entry) => /Payload\/[^/]+\.app\/Info\.plist$/i.test(entry.name) || /Info\.plist$/i.test(entry.name));
  if (!infoFile) throw new Error("No Info.plist found in archive.");

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
