import type {
  AltApp,
  AltCategory,
  AltNewsItem,
  AltPermissions,
  AltScreenshots,
  AltSource,
  AltVersion,
  ScreenshotItem,
  ValidationIssue,
} from "./types";

export const categories: AltCategory[] = [
  "developer",
  "entertainment",
  "games",
  "lifestyle",
  "other",
  "photo-video",
  "social",
  "utilities",
];

export const exampleSource: AltSource = {
  name: "My Example Source",
  subtitle: "A source for all of my apps",
  description: "Welcome to my source! Here you'll find all of my apps.",
  iconURL: "https://i.imgur.com/pqIZoZo.jpeg",
  website: "https://altstudio.app",
  patreonURL: "https://patreon.com/altstudio",
  tintColor: "#6156e2",
  featuredApps: [],
  apps: [],
  news: [],
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const asBoolean = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);

const asNumber = (value: unknown, fallback = 0): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

const asStringArray = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

export const makeVersion = (): AltVersion => ({
  version: "",
  buildVersion: "",
  date: new Date().toISOString().slice(0, 10),
  localizedDescription: "",
  downloadURL: "",
  size: 0,
  minOSVersion: "",
});

export const makePermissions = (): AltPermissions => ({
  entitlements: [],
  privacy: {},
});

export const makeApp = (): AltApp => ({
  name: "New App",
  bundleIdentifier: "",
  marketplaceID: "",
  developerName: "",
  subtitle: "",
  localizedDescription: "",
  iconURL: "",
  tintColor: "#808080",
  category: "other",
  screenshots: [],
  versions: [makeVersion()],
  appPermissions: makePermissions(),
});

export const makeNewsItem = (): AltNewsItem => ({
  title: "New Announcement",
  identifier: `news_${Math.random().toString(36).slice(2, 12)}`,
  caption: "",
  date: new Date().toISOString().slice(0, 16),
  tintColor: "#6156e2",
  imageURL: "",
  notify: false,
  url: "",
  appID: "",
});

export const normalizeScreenshotItem = (value: unknown): ScreenshotItem | null => {
  if (typeof value === "string") return value;
  const item = asRecord(value);
  const imageURL = asString(item.imageURL);
  if (!imageURL) return null;
  return {
    ...item,
    imageURL,
    width: typeof item.width === "number" ? item.width : undefined,
    height: typeof item.height === "number" ? item.height : undefined,
  };
};

export const normalizeScreenshots = (value: unknown): AltScreenshots | undefined => {
  if (Array.isArray(value)) return value.map(normalizeScreenshotItem).filter((item): item is ScreenshotItem => item !== null);
  const record = asRecord(value);
  if (!Object.keys(record).length) return undefined;
  return {
    ...record,
    iphone: Array.isArray(record.iphone)
      ? record.iphone.map(normalizeScreenshotItem).filter((item): item is ScreenshotItem => item !== null)
      : [],
    ipad: Array.isArray(record.ipad)
      ? record.ipad.map(normalizeScreenshotItem).filter((item): item is ScreenshotItem => item !== null)
      : [],
  };
};

export const normalizePermissions = (value: unknown): AltPermissions => {
  const record = asRecord(value);
  const privacyRecord = asRecord(record.privacy);
  const privacy = Object.fromEntries(
    Object.entries(privacyRecord).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  return {
    ...record,
    entitlements: asStringArray(record.entitlements),
    privacy,
  };
};

export const normalizeVersion = (value: unknown): AltVersion => {
  const record = asRecord(value);
  return {
    ...record,
    version: asString(record.version),
    buildVersion: asString(record.buildVersion),
    marketingVersion: asString(record.marketingVersion) || undefined,
    date: asString(record.date),
    localizedDescription: asString(record.localizedDescription),
    downloadURL: asString(record.downloadURL),
    size: asNumber(record.size),
    assetURLs: Object.keys(asRecord(record.assetURLs)).length ? (asRecord(record.assetURLs) as Record<string, string>) : undefined,
    minOSVersion: asString(record.minOSVersion),
    maxOSVersion: asString(record.maxOSVersion),
  };
};

export const normalizeApp = (value: unknown): AltApp => {
  const record = asRecord(value);
  const category = categories.includes(record.category as AltCategory) ? (record.category as AltCategory) : "other";
  return {
    ...record,
    name: asString(record.name),
    bundleIdentifier: asString(record.bundleIdentifier),
    marketplaceID: asString(record.marketplaceID),
    developerName: asString(record.developerName),
    subtitle: asString(record.subtitle),
    localizedDescription: asString(record.localizedDescription),
    iconURL: asString(record.iconURL),
    tintColor: asString(record.tintColor),
    category,
    screenshots: normalizeScreenshots(record.screenshots) ?? [],
    versions: Array.isArray(record.versions) ? record.versions.map(normalizeVersion) : [],
    appPermissions: normalizePermissions(record.appPermissions),
    patreon: Object.keys(asRecord(record.patreon)).length ? asRecord(record.patreon) : undefined,
  };
};

export const normalizeNewsItem = (value: unknown): AltNewsItem => {
  const record = asRecord(value);
  return {
    ...record,
    title: asString(record.title),
    identifier: asString(record.identifier),
    caption: asString(record.caption),
    date: asString(record.date),
    tintColor: asString(record.tintColor),
    imageURL: asString(record.imageURL),
    notify: asBoolean(record.notify),
    url: asString(record.url),
    appID: asString(record.appID),
  };
};

export const normalizeSource = (value: unknown): AltSource => {
  const record = asRecord(value);
  return {
    ...record,
    name: asString(record.name, "Untitled Source"),
    subtitle: asString(record.subtitle),
    description: asString(record.description),
    iconURL: asString(record.iconURL),
    headerURL: asString(record.headerURL),
    website: asString(record.website),
    patreonURL: asString(record.patreonURL),
    fediUsername: asString(record.fediUsername),
    tintColor: asString(record.tintColor),
    featuredApps: asStringArray(record.featuredApps),
    apps: Array.isArray(record.apps) ? record.apps.map(normalizeApp) : [],
    news: Array.isArray(record.news) ? record.news.map(normalizeNewsItem) : [],
  };
};

export const parseSourceText = (text: string): AltSource => {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) throw new Error("No JSON object found in file.");
  const raw = text.slice(jsonStart, jsonEnd + 1);
  const withoutTrailingCommas = raw.replace(/,\s*([}\]])/g, "$1");
  return normalizeSource(JSON.parse(withoutTrailingCommas));
};

const isHexColor = (value: string | undefined): boolean => !value || /^#?[0-9a-fA-F]{6}$/.test(value);

const addIssue = (issues: ValidationIssue[], path: string, message: string, level: ValidationIssue["level"] = "error") => {
  issues.push({ id: `${path}:${message}`, path, message, level });
};

export const validateSource = (source: AltSource): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (!source.name.trim()) addIssue(issues, "source.name", "Source name is required.");
  if (!isHexColor(source.tintColor)) addIssue(issues, "source.tintColor", "Tint color must be a hex color.");

  const bundleCounts = new Map<string, number>();
  source.apps.forEach((app) => {
    if (app.bundleIdentifier) bundleCounts.set(app.bundleIdentifier, (bundleCounts.get(app.bundleIdentifier) ?? 0) + 1);
  });

  source.apps.forEach((app, appIndex) => {
    const base = `apps[${appIndex}]`;
    if (!app.name.trim()) addIssue(issues, `${base}.name`, "App name is required.");
    if (!app.bundleIdentifier.trim()) addIssue(issues, `${base}.bundleIdentifier`, "Bundle identifier is required.");
    if (app.bundleIdentifier && bundleCounts.get(app.bundleIdentifier)! > 1) addIssue(issues, `${base}.bundleIdentifier`, "Bundle identifier must be unique.");
    if (!app.developerName.trim()) addIssue(issues, `${base}.developerName`, "Developer name is required.");
    if (!app.localizedDescription.trim()) addIssue(issues, `${base}.localizedDescription`, "Localized description is required.");
    if (!app.iconURL.trim()) addIssue(issues, `${base}.iconURL`, "Icon URL is required.");
    if (app.category && !categories.includes(app.category)) addIssue(issues, `${base}.category`, "Category is not supported.");
    if (!isHexColor(app.tintColor)) addIssue(issues, `${base}.tintColor`, "Tint color must be a hex color.");
    if (!app.versions.length) addIssue(issues, `${base}.versions`, "At least one version is required.");
    app.versions.forEach((version, versionIndex) => {
      const versionBase = `${base}.versions[${versionIndex}]`;
      if (!version.version.trim()) addIssue(issues, `${versionBase}.version`, "Version is required.");
      if (!version.buildVersion.trim()) addIssue(issues, `${versionBase}.buildVersion`, "Build version is required.");
      if (!version.date.trim()) addIssue(issues, `${versionBase}.date`, "Date is required.");
      if (!version.downloadURL.trim()) addIssue(issues, `${versionBase}.downloadURL`, "Download URL is required.");
      if (!Number.isFinite(version.size) || version.size < 0) addIssue(issues, `${versionBase}.size`, "Size must be zero or a positive number.");
    });
  });

  const newsCounts = new Map<string, number>();
  source.news.forEach((item) => {
    if (item.identifier) newsCounts.set(item.identifier, (newsCounts.get(item.identifier) ?? 0) + 1);
  });
  source.news.forEach((item, index) => {
    const base = `news[${index}]`;
    if (!item.title.trim()) addIssue(issues, `${base}.title`, "News title is required.");
    if (!item.identifier.trim()) addIssue(issues, `${base}.identifier`, "News identifier is required.");
    if (item.identifier && newsCounts.get(item.identifier)! > 1) addIssue(issues, `${base}.identifier`, "News identifier must be unique.");
    if (!item.caption.trim()) addIssue(issues, `${base}.caption`, "Caption is required.");
    if (!item.date.trim()) addIssue(issues, `${base}.date`, "Date is required.");
    if (!isHexColor(item.tintColor)) addIssue(issues, `${base}.tintColor`, "Tint color must be a hex color.");
  });

  source.featuredApps.forEach((id, index) => {
    if (!source.apps.some((app) => app.bundleIdentifier === id)) addIssue(issues, `featuredApps[${index}]`, "Featured app does not match an app bundle identifier.", "warning");
  });

  return issues;
};

export const compactForExport = (source: AltSource): AltSource => JSON.parse(JSON.stringify(source));

