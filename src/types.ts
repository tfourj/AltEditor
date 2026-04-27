export type AltCategory =
  | "developer"
  | "entertainment"
  | "games"
  | "lifestyle"
  | "other"
  | "photo-video"
  | "social"
  | "utilities";

export type ScreenshotItem =
  | string
  | {
      imageURL: string;
      width?: number;
      height?: number;
      [key: string]: unknown;
    };

export type AltScreenshots =
  | ScreenshotItem[]
  | {
      iphone?: ScreenshotItem[];
      ipad?: ScreenshotItem[];
      [key: string]: unknown;
    };

export interface AltVersion {
  version: string;
  buildVersion: string;
  marketingVersion?: string;
  date: string;
  localizedDescription?: string;
  downloadURL: string;
  size: number;
  assetURLs?: Record<string, string>;
  minOSVersion?: string;
  maxOSVersion?: string;
  [key: string]: unknown;
}

export interface AltPermissions {
  entitlements: string[];
  privacy: Record<string, string>;
  [key: string]: unknown;
}

export interface AltPatreon {
  pledge?: number;
  currency?: string;
  benefit?: string;
  tiers?: string[];
  [key: string]: unknown;
}

export interface AltApp {
  name: string;
  bundleIdentifier: string;
  marketplaceID?: string;
  developerName: string;
  subtitle?: string;
  localizedDescription: string;
  iconURL: string;
  tintColor?: string;
  category?: AltCategory;
  screenshots?: AltScreenshots;
  versions: AltVersion[];
  appPermissions: AltPermissions;
  patreon?: AltPatreon;
  [key: string]: unknown;
}

export interface AltNewsItem {
  title: string;
  identifier: string;
  caption: string;
  date: string;
  tintColor?: string;
  imageURL?: string;
  notify?: boolean;
  url?: string;
  appID?: string;
  [key: string]: unknown;
}

export interface AltSource {
  name: string;
  subtitle?: string;
  description?: string;
  iconURL?: string;
  headerURL?: string;
  website?: string;
  patreonURL?: string;
  fediUsername?: string;
  tintColor?: string;
  featuredApps: string[];
  apps: AltApp[];
  news: AltNewsItem[];
  [key: string]: unknown;
}

export interface ValidationIssue {
  id: string;
  path: string;
  message: string;
  level: "error" | "warning";
}

