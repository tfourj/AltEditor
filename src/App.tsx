import {
  AlertCircle,
  Check,
  Code2,
  Download,
  FileArchive,
  FileJson,
  Image,
  Import,
  Newspaper,
  Plus,
  Smartphone,
  Trash2,
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

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const readStoredSource = (): AltSource | null => {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? normalizeSource(JSON.parse(stored)) : null;
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

function ScreenshotEditor({ app, updateApp }: { app: AltApp; updateApp: (patch: Partial<AltApp>) => void }) {
  const screenshotList = Array.isArray(app.screenshots) ? app.screenshots : app.screenshots?.iphone ?? [];
  const setScreenshots = (items: ScreenshotItem[]) => updateApp({ screenshots: items });
  const values = screenshotList.map((item) => (typeof item === "string" ? item : item.imageURL)).join("\n");

  return (
    <label className="field">
      <span>Screenshots</span>
      <textarea
        value={values}
        rows={4}
        placeholder="One screenshot URL per line"
        onChange={(event) => setScreenshots(event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
      />
    </label>
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
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Source code</p>
            <h2>Formatted JSON</h2>
          </div>
          <button className="secondary" onClick={close} type="button">Close</button>
        </div>
        <pre>{code}</pre>
      </div>
    </div>
  );
}

export default function App() {
  const [source, setSource] = useState<AltSource | null>(readStoredSource);
  const [activeTab, setActiveTab] = useState<"source" | "apps" | "news">("source");
  const [showCode, setShowCode] = useState(false);
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
      setSource((current) => (current ? { ...current, apps: [...current.apps, app] } : current));
      setActiveTab("apps");
      setNotice(`Scanned ${file.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Archive scan failed.");
    }
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

        <div className="repo-icon-panel">
          <ImagePreview url={source.iconURL} label="Repository icon from icon URL" />
          <span>Repository icon</span>
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

        <section className="panel code-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Code</p>
              <h2>Live source JSON</h2>
            </div>
            <button className="secondary" onClick={() => setShowCode(true)} type="button">
              <Code2 size={16} /> View full code
            </button>
          </div>
          <pre>{code}</pre>
        </section>
      </main>

      {showCode && <CodeModal code={code} close={() => setShowCode(false)} />}
    </div>
  );
}
