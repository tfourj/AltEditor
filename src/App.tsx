import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  Download,
  FileArchive,
  FileJson,
  Image,
  Import,
  Link,
  Newspaper,
  Plus,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { scanArchiveForApp } from "./archiveScanner";
import {
  categories,
  compactForExport,
  exampleSource,
  makeApp,
  makeNewsItem,
  makePermissions,
  makeVersion,
  normalizeSource,
  parseSourceText,
  validateSource,
} from "./sourceModel";
import type { AltApp, AltNewsItem, AltSource, AltVersion, ScreenshotItem, ValidationIssue } from "./types";

const storageKey = "alteditor.source.v1";
const imgurClientIdKey = "alteditor.imgurClientId.v1";

type ScreenshotDevice = "iphone" | "ipad";
type ScreenshotObject = Extract<ScreenshotItem, { imageURL: string }>;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const isDefaultSeed = (source: AltSource): boolean =>
  source.name === exampleSource.name &&
  source.iconURL === exampleSource.iconURL &&
  source.apps.length === 0 &&
  source.news.length === 0;

const readStoredSource = (): AltSource | null => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    const source = normalizeSource(JSON.parse(stored));
    return isDefaultSeed(source) ? null : source;
  } catch {
    return null;
  }
};

const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const toFileName = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "altsource"}.json`;

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index <= 1 ? 0 : 1)} ${units[index]}`;
};

const asScreenshotObject = (item: ScreenshotItem): ScreenshotObject => (typeof item === "string" ? { imageURL: item } : item);

const getScreenshotLists = (screenshots: AltApp["screenshots"]): Record<ScreenshotDevice, ScreenshotObject[]> => {
  if (Array.isArray(screenshots)) {
    return {
      iphone: screenshots.map(asScreenshotObject),
      ipad: [],
    };
  }

  return {
    iphone: (screenshots?.iphone ?? []).map(asScreenshotObject),
    ipad: (screenshots?.ipad ?? []).map(asScreenshotObject),
  };
};

const getImageSize = (url: string): Promise<Pick<ScreenshotObject, "width" | "height">> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Could not read image size."));
    image.src = url;
  });

const getFileImageSize = async (file: File): Promise<Pick<ScreenshotObject, "width" | "height">> => {
  const objectURL = URL.createObjectURL(file);
  try {
    return await getImageSize(objectURL);
  } finally {
    URL.revokeObjectURL(objectURL);
  }
};

const uploadToImgur = async (file: File, clientId: string): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: {
      Authorization: `Client-ID ${clientId}`,
    },
    body: formData,
  });
  const body = await response.json();
  if (!response.ok || !body?.data?.link) throw new Error(body?.data?.error ?? "Imgur upload failed.");
  return body.data.link;
};

const field = (label: string, value: string | undefined, onChange: (value: string) => void, props?: { placeholder?: string; textarea?: boolean; type?: string }) => (
  <label className="field">
    <span>{label}</span>
    {props?.textarea ? (
      <textarea value={value ?? ""} placeholder={props.placeholder} onChange={(event) => onChange(event.target.value)} rows={4} />
    ) : (
      <input value={value ?? ""} type={props?.type ?? "text"} placeholder={props?.placeholder} onChange={(event) => onChange(event.target.value)} />
    )}
  </label>
);

const numberField = (label: string, value: number, onChange: (value: number) => void) => (
  <label className="field">
    <span>{label}</span>
    <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
);

function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  if (!issues.length) {
    return (
      <div className="status ok">
        <Check size={16} />
        JSON passes the editor checks
      </div>
    );
  }

  return (
    <div className="validation">
      <div className="validation-title">
        <AlertCircle size={16} />
        {issues.length} validation {issues.length === 1 ? "issue" : "issues"}
      </div>
      <div className="issue-list">
        {issues.map((issue) => (
          <div className={`issue ${issue.level}`} key={issue.id}>
            <strong>{issue.path}</strong>
            <span>{issue.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImagePreview({ url, label }: { url?: string; label: string }) {
  return (
    <div className="image-preview">
      {url ? <img src={url} alt={label} /> : <Image size={22} />}
    </div>
  );
}

function HomeScreen({
  createExample,
  importProject,
  notice,
}: {
  createExample: () => void;
  importProject: () => void;
  notice: string;
}) {
  return (
    <main className="home-screen">
      <section className="home-panel">
        <div className="brand home-brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>AltEditor</h1>
            <span>AltStore PAL repository editor</span>
          </div>
        </div>
        <div className="home-copy">
          <p className="eyebrow">Start</p>
          <h2>Create or import a repository</h2>
          <p>
            Open an existing AltStore source JSON file or start from the default example repo.
          </p>
        </div>
        <div className="home-actions">
          <button onClick={createExample} type="button">
            <Plus size={17} /> Create default
          </button>
          <button className="secondary" onClick={importProject} type="button">
            <Import size={17} /> Import JSON
          </button>
        </div>
        {notice && <div className="home-notice">{notice}</div>}
      </section>
    </main>
  );
}

function SourceEditor({ source, updateSource }: { source: AltSource; updateSource: (patch: Partial<AltSource>) => void }) {
  const featuredText = source.featuredApps.join("\n");
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Source</p>
          <h2>Repository settings</h2>
        </div>
        <ImagePreview url={source.iconURL} label="Source icon" />
      </div>
      <div className="grid two">
        {field("Name", source.name, (name) => updateSource({ name }))}
        {field("Subtitle", source.subtitle, (subtitle) => updateSource({ subtitle }))}
      </div>
      {field("Description", source.description, (description) => updateSource({ description }), { textarea: true })}
      <div className="grid two">
        {field("Icon URL", source.iconURL, (iconURL) => updateSource({ iconURL }))}
        {field("Header URL", source.headerURL, (headerURL) => updateSource({ headerURL }))}
        {field("Website", source.website, (website) => updateSource({ website }))}
        {field("Patreon URL", source.patreonURL, (patreonURL) => updateSource({ patreonURL }))}
        {field("Fediverse username", source.fediUsername, (fediUsername) => updateSource({ fediUsername }))}
        {field("Tint color", source.tintColor, (tintColor) => updateSource({ tintColor }), { type: "text", placeholder: "#6156e2" })}
      </div>
      <label className="field">
        <span>Featured apps</span>
        <textarea
          value={featuredText}
          placeholder="One bundle identifier per line"
          rows={3}
          onChange={(event) =>
            updateSource({
              featuredApps: event.target.value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      {!source.featuredApps.length && <div className="empty slim">No featured apps</div>}
    </section>
  );
}

function ScreenshotDeviceSection({
  device,
  items,
  addScreenshot,
  updateScreenshot,
  removeScreenshot,
  imgurClientId,
}: {
  device: ScreenshotDevice;
  items: ScreenshotObject[];
  addScreenshot: (device: ScreenshotDevice, item: ScreenshotObject) => void;
  updateScreenshot: (device: ScreenshotDevice, index: number, item: ScreenshotObject) => void;
  removeScreenshot: (device: ScreenshotDevice, index: number) => void;
  imgurClientId: string;
}) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const label = device === "iphone" ? "iPhone" : "iPad";
  const Icon = device === "iphone" ? Smartphone : Tablet;

  const addURL = async () => {
    const imageURL = url.trim();
    if (!imageURL) return;
    setBusy(true);
    setStatus("");
    try {
      const size = await getImageSize(imageURL);
      addScreenshot(device, { imageURL, ...size });
      setStatus(`Added ${size.width}x${size.height}`);
    } catch {
      addScreenshot(device, { imageURL });
      setStatus("Added URL without size");
    } finally {
      setUrl("");
      setBusy(false);
    }
  };

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!imgurClientId.trim()) {
      setStatus("Enter an Imgur Client ID first");
      return;
    }

    setBusy(true);
    setStatus(`Uploading ${file.name}`);
    try {
      const [size, imageURL] = await Promise.all([getFileImageSize(file), uploadToImgur(file, imgurClientId.trim())]);
      addScreenshot(device, { imageURL, ...size });
      setStatus(`Uploaded ${size.width}x${size.height}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screenshot-device">
      <div className="screenshot-device-header">
        <div>
          <h4>
            <Icon size={16} /> {label}
          </h4>
          <span>{items.length} screenshots</span>
        </div>
        <div className="button-row">
          <button className="secondary" disabled={busy} onClick={() => fileInput.current?.click()} type="button">
            <Upload size={15} /> Upload
          </button>
          <input ref={fileInput} hidden type="file" accept="image/*" onChange={uploadFile} />
        </div>
      </div>

      <div className="screenshot-add-row">
        <input value={url} placeholder={`${label} screenshot URL`} onChange={(event) => setUrl(event.target.value)} />
        <button disabled={busy || !url.trim()} onClick={addURL} type="button">
          <Link size={15} /> Add link
        </button>
      </div>
      {status && <div className="screenshot-status">{status}</div>}

      {items.length ? (
        <div className="screenshot-grid">
          {items.map((item, index) => (
            <div className="screenshot-card" key={`${item.imageURL}-${index}`}>
              <div className="screenshot-frame">
                <img src={item.imageURL} alt={`${label} screenshot ${index + 1}`} />
              </div>
              <div className="screenshot-fields">
                {field("Image URL", item.imageURL, (imageURL) => updateScreenshot(device, index, { ...item, imageURL }))}
                <div className="grid two">
                  {numberField("Width", Number(item.width ?? 0), (width) => updateScreenshot(device, index, { ...item, width }))}
                  {numberField("Height", Number(item.height ?? 0), (height) => updateScreenshot(device, index, { ...item, height }))}
                </div>
                <button
                  className="secondary small-button"
                  onClick={() => void getImageSize(item.imageURL).then((size) => updateScreenshot(device, index, { ...item, ...size })).catch(() => setStatus("Could not read image size"))}
                  type="button"
                >
                  Read size
                </button>
                <button className="icon-button danger" onClick={() => removeScreenshot(device, index)} type="button" aria-label={`Remove ${label} screenshot`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty slim">No {label} screenshots</div>
      )}
    </div>
  );
}

function ScreenshotEditor({ app, updateApp }: { app: AltApp; updateApp: (patch: Partial<AltApp>) => void }) {
  const [imgurClientId, setImgurClientId] = useState(() => localStorage.getItem(imgurClientIdKey) ?? "");
  const lists = getScreenshotLists(app.screenshots);

  useEffect(() => {
    localStorage.setItem(imgurClientIdKey, imgurClientId);
  }, [imgurClientId]);

  const setDeviceItems = (device: ScreenshotDevice, items: ScreenshotObject[]) => {
    const current = Array.isArray(app.screenshots) ? {} : app.screenshots ?? {};
    updateApp({
      screenshots: {
        ...current,
        iphone: device === "iphone" ? items : lists.iphone,
        ipad: device === "ipad" ? items : lists.ipad,
      },
    });
  };

  return (
    <section className="screenshot-manager">
      <div className="subsection-title">
        <h3>Screenshots</h3>
      </div>
      <label className="field">
        <span>Imgur Client ID</span>
        <input
          value={imgurClientId}
          placeholder="Required for automatic file uploads"
          onChange={(event) => setImgurClientId(event.target.value)}
        />
      </label>
      <div className="screenshot-devices">
        {(["iphone", "ipad"] as ScreenshotDevice[]).map((device) => (
          <ScreenshotDeviceSection
            key={device}
            device={device}
            items={lists[device]}
            imgurClientId={imgurClientId}
            addScreenshot={(target, item) => setDeviceItems(target, [...lists[target], item])}
            updateScreenshot={(target, index, item) => setDeviceItems(target, lists[target].map((current, itemIndex) => (itemIndex === index ? item : current)))}
            removeScreenshot={(target, index) => setDeviceItems(target, lists[target].filter((_, itemIndex) => itemIndex !== index))}
          />
        ))}
      </div>
    </section>
  );
}

function VersionEditor({
  version,
  updateVersion,
  removeVersion,
}: {
  version: AltVersion;
  updateVersion: (patch: Partial<AltVersion>) => void;
  removeVersion: () => void;
}) {
  return (
    <div className="nested">
      <div className="nested-header">
        <strong>{version.version || "New version"}</strong>
        <button className="icon-button danger" onClick={removeVersion} type="button" aria-label="Remove version">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="grid three">
        {field("Version", version.version, (value) => updateVersion({ version: value }))}
        {field("Build", version.buildVersion, (buildVersion) => updateVersion({ buildVersion }))}
        {field("Date", version.date, (date) => updateVersion({ date }))}
      </div>
      {field("Download URL", version.downloadURL, (downloadURL) => updateVersion({ downloadURL }))}
      <div className="grid three">
        {numberField("Size", version.size, (size) => updateVersion({ size }))}
        {field("Min iOS", version.minOSVersion, (minOSVersion) => updateVersion({ minOSVersion }))}
        {field("Max iOS", version.maxOSVersion, (maxOSVersion) => updateVersion({ maxOSVersion }))}
      </div>
      {field("Release notes", version.localizedDescription, (localizedDescription) => updateVersion({ localizedDescription }), { textarea: true })}
    </div>
  );
}

function AppEditor({
  app,
  index,
  updateApp,
  removeApp,
}: {
  app: AltApp;
  index: number;
  updateApp: (patch: Partial<AltApp>) => void;
  removeApp: () => void;
}) {
  const privacyText = Object.entries(app.appPermissions?.privacy ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const entitlementsText = (app.appPermissions?.entitlements ?? []).join("\n");

  return (
    <details className="panel item-panel" open={index === 0}>
      <summary>
        <div className="summary-main">
          <ImagePreview url={app.iconURL} label={`${app.name} icon`} />
          <div>
            <strong>{app.name || "Untitled app"}</strong>
            <span>{app.bundleIdentifier || "No bundle identifier"}</span>
          </div>
        </div>
        <button className="icon-button danger" onClick={(event) => { event.preventDefault(); removeApp(); }} type="button" aria-label="Remove app">
          <Trash2 size={16} />
        </button>
      </summary>
      <div className="grid two">
        {field("Name", app.name, (name) => updateApp({ name }))}
        {field("Bundle identifier", app.bundleIdentifier, (bundleIdentifier) => updateApp({ bundleIdentifier }))}
        {field("Marketplace ID", app.marketplaceID, (marketplaceID) => updateApp({ marketplaceID }))}
        {field("Developer", app.developerName, (developerName) => updateApp({ developerName }))}
        {field("Subtitle", app.subtitle, (subtitle) => updateApp({ subtitle }))}
        {field("Icon URL", app.iconURL, (iconURL) => updateApp({ iconURL }))}
        {field("Tint color", app.tintColor, (tintColor) => updateApp({ tintColor }))}
        <label className="field">
          <span>Category</span>
          <select value={app.category ?? "other"} onChange={(event) => updateApp({ category: event.target.value as AltApp["category"] })}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>
      {field("Localized description", app.localizedDescription, (localizedDescription) => updateApp({ localizedDescription }), { textarea: true })}
      <ScreenshotEditor app={app} updateApp={updateApp} />

      <div className="subsection-title">
        <h3>Versions</h3>
        <button
          className="small-button"
          onClick={() => updateApp({ versions: [...app.versions, makeVersion()] })}
          type="button"
        >
          <Plus size={15} /> Add version
        </button>
      </div>
      {app.versions.map((version, versionIndex) => (
        <VersionEditor
          key={versionIndex}
          version={version}
          updateVersion={(patch) =>
            updateApp({
              versions: app.versions.map((item, itemIndex) => (itemIndex === versionIndex ? { ...item, ...patch } : item)),
            })
          }
          removeVersion={() => updateApp({ versions: app.versions.filter((_, itemIndex) => itemIndex !== versionIndex) })}
        />
      ))}

      <div className="grid two">
        <label className="field">
          <span>Entitlements</span>
          <textarea
            value={entitlementsText}
            rows={4}
            placeholder="One entitlement per line"
            onChange={(event) =>
              updateApp({
                appPermissions: {
                  ...(app.appPermissions ?? makePermissions()),
                  entitlements: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                },
              })
            }
          />
        </label>
        <label className="field">
          <span>Privacy permissions</span>
          <textarea
            value={privacyText}
            rows={4}
            placeholder="NSCameraUsageDescription: Reason"
            onChange={(event) =>
              updateApp({
                appPermissions: {
                  ...(app.appPermissions ?? makePermissions()),
                  privacy: Object.fromEntries(
                    event.target.value
                      .split("\n")
                      .map((line) => line.split(":"))
                      .filter(([key, ...rest]) => key.trim() && rest.join(":").trim())
                      .map(([key, ...rest]) => [key.trim(), rest.join(":").trim()]),
                  ),
                },
              })
            }
          />
        </label>
      </div>

      <div className="subsection-title">
        <h3>Patreon</h3>
        <label className="toggle">
          <input type="checkbox" checked={Boolean(app.patreon)} onChange={(event) => updateApp({ patreon: event.target.checked ? {} : undefined })} />
          Enabled
        </label>
      </div>
      {app.patreon && (
        <div className="grid four">
          {numberField("Pledge", Number(app.patreon.pledge ?? 0), (pledge) => updateApp({ patreon: { ...app.patreon, pledge } }))}
          {field("Currency", app.patreon.currency, (currency) => updateApp({ patreon: { ...app.patreon, currency } }))}
          {field("Benefit", app.patreon.benefit, (benefit) => updateApp({ patreon: { ...app.patreon, benefit } }))}
          {field("Tiers", app.patreon.tiers?.join(","), (tiers) => updateApp({ patreon: { ...app.patreon, tiers: tiers.split(",").map((item) => item.trim()).filter(Boolean) } }))}
        </div>
      )}
    </details>
  );
}

function AppsEditor({
  source,
  updateSource,
  scanArchive,
}: {
  source: AltSource;
  updateSource: (patch: Partial<AltSource>) => void;
  scanArchive: (file: File) => Promise<void>;
}) {
  const archiveInput = useRef<HTMLInputElement>(null);
  const updateApp = (index: number, patch: Partial<AltApp>) => {
    updateSource({ apps: source.apps.map((app, itemIndex) => (itemIndex === index ? { ...app, ...patch } : app)) });
  };

  return (
    <section className="stack">
      <div className="toolbar-row">
        <div>
          <p className="eyebrow">Apps</p>
          <h2>Application listings</h2>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => archiveInput.current?.click()} type="button">
            <FileArchive size={16} /> Scan IPA/ADP
          </button>
          <button onClick={() => updateSource({ apps: [...source.apps, makeApp()] })} type="button">
            <Plus size={16} /> Add app
          </button>
        </div>
        <input
          ref={archiveInput}
          hidden
          type="file"
          accept=".ipa,.adp,.zip"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void scanArchive(file);
          }}
        />
      </div>
      {!source.apps.length && <div className="empty">No apps found</div>}
      {source.apps.map((app, index) => (
        <AppEditor
          key={`${app.bundleIdentifier}-${index}`}
          app={app}
          index={index}
          updateApp={(patch) => updateApp(index, patch)}
          removeApp={() => updateSource({ apps: source.apps.filter((_, itemIndex) => itemIndex !== index) })}
        />
      ))}
    </section>
  );
}

function NewsEditor({ source, updateSource }: { source: AltSource; updateSource: (patch: Partial<AltSource>) => void }) {
  const updateNews = (index: number, patch: Partial<AltNewsItem>) => {
    updateSource({ news: source.news.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)) });
  };

  return (
    <section className="stack">
      <div className="toolbar-row">
        <div>
          <p className="eyebrow">News</p>
          <h2>Announcements</h2>
        </div>
        <button onClick={() => updateSource({ news: [...source.news, makeNewsItem()] })} type="button">
          <Plus size={16} /> Add news
        </button>
      </div>
      {!source.news.length && <div className="empty">No news found</div>}
      {source.news.map((item, index) => (
        <details className="panel item-panel" open={index === 0} key={`${item.identifier}-${index}`}>
          <summary>
            <div className="summary-main">
              <ImagePreview url={item.imageURL} label={`${item.title} image`} />
              <div>
                <strong>{item.title || "Untitled news"}</strong>
                <span>{item.identifier || "No identifier"}</span>
              </div>
            </div>
            <button
              className="icon-button danger"
              onClick={(event) => {
                event.preventDefault();
                updateSource({ news: source.news.filter((_, itemIndex) => itemIndex !== index) });
              }}
              type="button"
              aria-label="Remove news"
            >
              <Trash2 size={16} />
            </button>
          </summary>
          <div className="grid two">
            {field("Title", item.title, (title) => updateNews(index, { title }))}
            {field("Identifier", item.identifier, (identifier) => updateNews(index, { identifier }))}
            {field("Caption", item.caption, (caption) => updateNews(index, { caption }))}
            {field("Date", item.date, (date) => updateNews(index, { date }))}
            {field("Tint color", item.tintColor, (tintColor) => updateNews(index, { tintColor }))}
            {field("Image URL", item.imageURL, (imageURL) => updateNews(index, { imageURL }))}
            {field("URL", item.url, (url) => updateNews(index, { url }))}
            {field("App bundle ID", item.appID, (appID) => updateNews(index, { appID }))}
          </div>
          <label className="toggle inline-toggle">
            <input type="checkbox" checked={Boolean(item.notify)} onChange={(event) => updateNews(index, { notify: event.target.checked })} />
            Notify users
          </label>
        </details>
      ))}
    </section>
  );
}

function CodeModal({ code, close }: { code: string; close: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.append(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Source code</p>
            <h2>Formatted JSON</h2>
          </div>
          <div className="button-row">
            <button className="secondary" onClick={copyCode} type="button">
              <Copy size={16} /> {copied ? "Copied" : "Copy"}
            </button>
            <button className="secondary" onClick={close} type="button">Close</button>
          </div>
        </div>
        <pre>{code}</pre>
      </div>
    </div>
  );
}

type ScannedFieldKey = "name" | "bundleIdentifier" | "marketplaceID";

function ScannedArchiveModal({
  app,
  targetApp,
  close,
  importToEditor,
}: {
  app: AltApp;
  targetApp?: AltApp;
  close: () => void;
  importToEditor: (fields: Record<ScannedFieldKey, boolean>, addVersion: boolean) => void;
}) {
  const [fields, setFields] = useState<Record<ScannedFieldKey, boolean>>({
    name: Boolean(app.name),
    bundleIdentifier: Boolean(app.bundleIdentifier),
    marketplaceID: Boolean(app.marketplaceID),
  });
  const [addVersion, setAddVersion] = useState(true);
  const version = app.versions[0];
  const versionExists = Boolean(
    targetApp?.versions.some(
      (item) =>
        item.version === version.version &&
        item.buildVersion === version.buildVersion,
    ),
  );
  const canImportFields = Object.values(fields).some(Boolean);
  const canAddVersion = addVersion && !versionExists;

  const toggleField = (key: ScannedFieldKey) => {
    setFields((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal scan-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Scanned IPA/ADP</p>
            <h2>Select data to import</h2>
          </div>
          <button className="secondary" onClick={close} type="button">Close</button>
        </div>

        <p className="block-header">Select which data from the ipa file you want to import into the editor</p>
        <div className="scan-list">
          {[
            ["name", "Name", app.name],
            ["bundleIdentifier", "Bundle ID", app.bundleIdentifier],
            ["marketplaceID", "Marketplace ID", app.marketplaceID],
          ].map(([key, label, value]) => (
            <label className="scan-check-row" key={key}>
              <input
                checked={fields[key as ScannedFieldKey]}
                disabled={!value}
                type="checkbox"
                onChange={() => toggleField(key as ScannedFieldKey)}
              />
              <span>
                <small>{label}</small>
                {value || "Not found"}
              </span>
            </label>
          ))}
          <button
            disabled={!canImportFields && !canAddVersion}
            onClick={() => importToEditor(fields, canAddVersion)}
            type="button"
          >
            Import to editor
          </button>
        </div>

        <div className="scan-list divided">
          <div className="scan-info-row">
            <span>Version</span>
            <strong>
              {version.version || "Not found"}
              {versionExists ? <em className="badge muted">Exists</em> : <em className="badge">Added</em>}
            </strong>
          </div>
          <div className="scan-info-row">
            <span>Size</span>
            <strong>{formatBytes(version.size)}</strong>
          </div>
          <button
            className="secondary"
            disabled={versionExists}
            onClick={() => importToEditor({ name: false, bundleIdentifier: false, marketplaceID: false }, true)}
            type="button"
          >
            Add this version
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [source, setSource] = useState<AltSource | null>(readStoredSource);
  const [activeTab, setActiveTab] = useState<"source" | "apps" | "news">("source");
  const [showCode, setShowCode] = useState(false);
  const [scannedApp, setScannedApp] = useState<AltApp | null>(null);
  const [notice, setNotice] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  const updateSource = (patch: Partial<AltSource>) => setSource((current) => (current ? { ...current, ...patch } : current));
  const issues = useMemo(() => (source ? validateSource(source) : []), [source]);
  const code = useMemo(() => (source ? JSON.stringify(compactForExport(source), null, 2) : ""), [source]);

  useEffect(() => {
    if (source) localStorage.setItem(storageKey, JSON.stringify(source));
  }, [source]);

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setSource(parseSourceText(await file.text()));
      setActiveTab("source");
      setNotice(`Imported ${file.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import failed.");
    }
  };

  const scanArchive = async (file: File) => {
    try {
      const app = await scanArchiveForApp(file);
      setScannedApp(app);
      setActiveTab("apps");
      setNotice(`Scanned ${file.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Archive scan failed.");
    }
  };

  const importScannedApp = (fields: Record<ScannedFieldKey, boolean>, addVersion: boolean) => {
    if (!scannedApp) return;
    setSource((current) => {
      if (!current) return current;
      const targetIndex = current.apps.findIndex((app) => app.bundleIdentifier === scannedApp.bundleIdentifier);
      const patch: Partial<AltApp> = {};
      if (fields.name) patch.name = scannedApp.name;
      if (fields.bundleIdentifier) patch.bundleIdentifier = scannedApp.bundleIdentifier;
      if (fields.marketplaceID) patch.marketplaceID = scannedApp.marketplaceID;

      if (targetIndex === -1) {
        return {
          ...current,
          apps: [
            ...current.apps,
            {
              ...makeApp(),
              ...patch,
              versions: addVersion ? scannedApp.versions : [],
              appPermissions: scannedApp.appPermissions,
            },
          ],
        };
      }

      return {
        ...current,
        apps: current.apps.map((app, index) => {
          if (index !== targetIndex) return app;
          const version = scannedApp.versions[0];
          const hasVersion = app.versions.some((item) => item.version === version.version && item.buildVersion === version.buildVersion);
          return {
            ...app,
            ...patch,
            versions: addVersion && !hasVersion ? [...app.versions, version] : app.versions,
            appPermissions: scannedApp.appPermissions,
          };
        }),
      };
    });
    setScannedApp(null);
    setActiveTab("apps");
    setNotice("Imported scanned data");
  };

  const createExample = () => {
    setSource(clone(exampleSource));
    setActiveTab("source");
    setNotice("Created default example repo");
  };

  if (!source) {
    return (
      <>
        <HomeScreen createExample={createExample} importProject={() => importInput.current?.click()} notice={notice} />
        <input ref={importInput} hidden type="file" accept=".json,.md,.txt" onChange={importJson} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>AltEditor</h1>
            <span>AltStore PAL repository editor</span>
          </div>
        </div>

        <div className="source-card">
          <ImagePreview url={source.iconURL} label="Current source icon" />
          <div>
            <strong>{source.name || "Untitled Source"}</strong>
            <span>{source.subtitle || `${source.apps.length} apps, ${source.news.length} news items`}</span>
          </div>
        </div>

        <nav className="side-actions" aria-label="Project actions">
          <button onClick={createExample} type="button">
            <Plus size={17} /> New
          </button>
          <button onClick={() => importInput.current?.click()} type="button">
            <Import size={17} /> Import JSON
          </button>
          <button onClick={() => downloadText(toFileName(source.name), code)} type="button">
            <Download size={17} /> Export JSON
          </button>
          <button onClick={() => setShowCode(true)} type="button">
            <Code2 size={17} /> View code
          </button>
        </nav>
        <input ref={importInput} hidden type="file" accept=".json,.md,.txt" onChange={importJson} />

        <ValidationPanel issues={issues} />
        {notice && <div className="notice">{notice}</div>}
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Project</p>
            <h2>{source.name || "Untitled Source"}</h2>
          </div>
          <div className="tabs" role="tablist">
            <button className={activeTab === "source" ? "active" : ""} onClick={() => setActiveTab("source")} type="button">
              <FileJson size={16} /> Source
            </button>
            <button className={activeTab === "apps" ? "active" : ""} onClick={() => setActiveTab("apps")} type="button">
              <Smartphone size={16} /> Apps
            </button>
            <button className={activeTab === "news" ? "active" : ""} onClick={() => setActiveTab("news")} type="button">
              <Newspaper size={16} /> News
            </button>
          </div>
        </header>

        {activeTab === "source" && <SourceEditor source={source} updateSource={updateSource} />}
        {activeTab === "apps" && <AppsEditor source={source} updateSource={updateSource} scanArchive={scanArchive} />}
        {activeTab === "news" && <NewsEditor source={source} updateSource={updateSource} />}
      </main>

      {showCode && <CodeModal code={code} close={() => setShowCode(false)} />}
      {scannedApp && (
        <ScannedArchiveModal
          app={scannedApp}
          targetApp={source.apps.find((app) => app.bundleIdentifier === scannedApp.bundleIdentifier)}
          close={() => setScannedApp(null)}
          importToEditor={importScannedApp}
        />
      )}
    </div>
  );
}
