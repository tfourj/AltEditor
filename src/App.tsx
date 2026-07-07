import { Code2, Copy, Download, ExternalLink, FileJson, Import, Moon, Newspaper, Plus, Smartphone, Sun, Trash2 } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { scanArchiveForApp, type ScannedArchive } from "./archiveScanner";
import { AppsEditor } from "./components/AppsEditor";
import { HomeScreen } from "./components/HomeScreen";
import { ImagePreview } from "./components/ImagePreview";
import {
  CodeModal,
  ImportUrlModal,
  ScannedArchiveModal,
  UrlSourceUpdateModal,
  type ScannedFieldKey,
} from "./components/Modals";
import { NewsEditor } from "./components/NewsEditor";
import { SourceEditor } from "./components/SourceEditor";
import { ValidationPanel } from "./components/ValidationPanel";
import { clone, downloadText, generateId, readSourcesStore, toFileName, writeSourcesStore, type SourcesStore } from "./lib/sourceStorage";
import { suggestDownloadUrl } from "./downloadUrlSuggestion";
import {
  compactForExport,
  exampleSource,
  makeApp,
  parseSourceText,
  sourceContentKey,
  validateSource,
} from "./sourceModel";
import type { AltApp, AltSource } from "./types";

const IMPORT_URL_HISTORY_KEY = "alteditor.importUrlHistory";
const THEME_KEY = "alteditor.theme";
type ThemeMode = "light" | "dark";

type PendingImport = {
  source: AltSource;
  fileName: string;
  importUrl?: string;
};

type PendingUrlSourceUpdate = {
  id: string;
  localName: string;
  remoteSource: AltSource;
  url: string;
};

type UrlSourceCheckResult = PendingUrlSourceUpdate | { id: string; failed: true } | null;

const isPendingUrlSourceUpdate = (result: UrlSourceCheckResult): result is PendingUrlSourceUpdate =>
  Boolean(result && !("failed" in result));

function readTheme(): ThemeMode {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

function readImportUrls() {
  try {
    const stored = JSON.parse(localStorage.getItem(IMPORT_URL_HISTORY_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveImportUrl(url: string) {
  try {
    const urls = readImportUrls();
    const nextUrls = [url, ...urls.filter((item) => item !== url)].slice(0, 5);
    localStorage.setItem(IMPORT_URL_HISTORY_KEY, JSON.stringify(nextUrls));
    return nextUrls;
  } catch {
    const nextUrls = [url];
    localStorage.setItem(IMPORT_URL_HISTORY_KEY, JSON.stringify(nextUrls));
    return nextUrls;
  }
}

export default function App() {
  const [store, setStore] = useState<SourcesStore>(readSourcesStore);
  const [theme, setTheme] = useState<ThemeMode>(readTheme);
  const [activeTab, setActiveTab] = useState<"source" | "apps" | "news">("source");
  const [showCode, setShowCode] = useState(false);
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [importingUrl, setImportingUrl] = useState(false);
  const [importUrlHistory, setImportUrlHistory] = useState(readImportUrls);
  const [scannedArchive, setScannedArchive] = useState<ScannedArchive | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeFading, setNoticeFading] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingUrlSourceUpdates, setPendingUrlSourceUpdates] = useState<PendingUrlSourceUpdate[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const checkedImportUrls = useRef(false);

  const source = useMemo(() => {
    if (!store.activeId) return null;
    return store.sources.find((s) => s.id === store.activeId)?.source ?? null;
  }, [store]);

  const updateSource = (patch: Partial<AltSource>) =>
    setStore((prev) => {
      if (!prev.activeId) return prev;
      return {
        ...prev,
        sources: prev.sources.map((s) =>
          s.id === prev.activeId ? { ...s, source: { ...s.source, ...patch }, lastModified: Date.now() } : s,
        ),
      };
    });

  const issues = useMemo(() => (source ? validateSource(source) : []), [source]);
  const code = useMemo(() => (source ? JSON.stringify(compactForExport(source), null, 2) : ""), [source]);

  useEffect(() => {
    writeSourcesStore(store);
  }, [store]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!notice) return;
    setNoticeFading(false);
    const fadeTimeout = window.setTimeout(() => setNoticeFading(true), 4500);
    const clearTimeout = window.setTimeout(() => setNotice(""), 5000);
    return () => {
      window.clearTimeout(fadeTimeout);
      window.clearTimeout(clearTimeout);
    };
  }, [notice]);

  useEffect(() => {
    if (checkedImportUrls.current) return;
    checkedImportUrls.current = true;

    const sourcesWithUrls = store.sources.filter((item) => item.importUrl);
    if (!sourcesWithUrls.length) return;

    const checkImportedSourceUrls = async () => {
      const results = await Promise.all(
        sourcesWithUrls.map(async (item): Promise<UrlSourceCheckResult> => {
          try {
            const url = item.importUrl!;
            const response = await fetch(url, { cache: "no-cache" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const remoteSource = parseSourceText(await response.text());
            if (sourceContentKey(item.source) === sourceContentKey(remoteSource)) return null;

            return {
              id: item.id,
              localName: item.source.name || "Untitled Source",
              remoteSource,
              url,
            };
          } catch {
            return { id: item.id, failed: true };
          }
        }),
      );

      const updates = results.filter(isPendingUrlSourceUpdate);
      if (updates.length) setPendingUrlSourceUpdates(updates);

      const failedCount = results.filter((result) => result && "failed" in result).length;
      if (failedCount > 0) {
        setNotice(`Could not check ${failedCount} imported source URL${failedCount === 1 ? "" : "s"}.`);
      }
    };

    void checkImportedSourceUrls();
  }, [store.sources]);

  const addSource = (newSource: AltSource, importUrl?: string) => {
    const id = generateId();
    setStore((prev) => ({
      sources: [...prev.sources, { id, source: newSource, lastModified: Date.now(), importUrl }],
      activeId: id,
    }));
  };

  const selectSource = (id: string) =>
    setStore((prev) => (prev.sources.some((s) => s.id === id) ? { ...prev, activeId: id } : prev));

  const requestDeleteSource = (id: string) => {
    const target = store.sources.find((s) => s.id === id);
    if (!target) return;
    setPendingDelete({ id, name: target.source.name || "Untitled Source" });
  };

  const confirmDeleteSource = () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setStore((prev) => {
      const nextSources = prev.sources.filter((s) => s.id !== id);
      return {
        sources: nextSources,
        activeId: prev.activeId === id ? (nextSources[0]?.id ?? null) : prev.activeId,
      };
    });
    setPendingDelete(null);
    setNotice("Source deleted");
  };

  const duplicateSource = (id: string) => {
    setStore((prev) => {
      const target = prev.sources.find((s) => s.id === id);
      if (!target) return prev;
      const newId = generateId();
      const duplicated = clone(target.source);
      duplicated.name = `${duplicated.name} (copy)`;
      return {
        sources: [...prev.sources, { id: newId, source: duplicated, lastModified: Date.now() }],
        activeId: newId,
      };
    });
    setNotice("Source duplicated");
  };

  const importSourceText = (text: string, label: string, importUrl?: string) => {
    const parsed = parseSourceText(text);
    const existing = store.sources.find((s) => s.source.name === parsed.name);
    if (existing) {
      setPendingImport({ source: parsed, fileName: label, importUrl });
      return;
    }
    addSource(parsed, importUrl);
    setActiveTab("source");
    setNotice(`Imported ${label}`);
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      importSourceText(await file.text(), file.name);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import failed.");
    }
  };

  const importJsonFromUrl = async (url: string) => {
    const sourceUrl = url.trim();
    if (!sourceUrl) return;
    setImportingUrl(true);
    try {
      const parsedUrl = new URL(sourceUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error("URL must start with http:// or https://");
      }
      const response = await fetch(parsedUrl.toString(), { cache: "no-cache" });
      if (!response.ok) throw new Error(`Import failed with HTTP ${response.status}`);
      importSourceText(await response.text(), parsedUrl.toString(), parsedUrl.toString());
      setImportUrlHistory(saveImportUrl(parsedUrl.toString()));
      setShowImportUrl(false);
    } catch (error) {
      setNotice(
        error instanceof TypeError ? "Import failed. The URL may be blocked by CORS." : error instanceof Error ? error.message : "Import failed.",
      );
    } finally {
      setImportingUrl(false);
    }
  };

  const resolveImport = (action: "replace" | "add" | "cancel") => {
    if (!pendingImport) return;
    if (action === "replace") {
      const existing = store.sources.find((s) => s.source.name === pendingImport.source.name);
      if (existing) {
        setStore((prev) => ({
          sources: prev.sources.map((s) =>
            s.id === existing.id
              ? { ...s, source: pendingImport.source, lastModified: Date.now(), importUrl: pendingImport.importUrl }
              : s,
          ),
          activeId: existing.id,
        }));
        setNotice(`Replaced '${pendingImport.source.name}'`);
      }
    } else if (action === "add") {
      addSource(pendingImport.source, pendingImport.importUrl);
      setNotice(`Imported ${pendingImport.fileName}`);
    } else {
      setNotice("Import cancelled");
    }
    setPendingImport(null);
    setActiveTab("source");
  };

  const resolveUrlSourceUpdate = (action: "local" | "url") => {
    const pendingUpdate = pendingUrlSourceUpdates[0];
    if (!pendingUpdate) return;

    if (action === "url") {
      setStore((prev) => ({
        sources: prev.sources.map((s) =>
          s.id === pendingUpdate.id
            ? { ...s, source: pendingUpdate.remoteSource, lastModified: Date.now(), importUrl: pendingUpdate.url }
            : s,
        ),
        activeId: pendingUpdate.id,
      }));
      setActiveTab("source");
      setNotice(`Updated ${pendingUpdate.remoteSource.name || "source"} from URL`);
    } else {
      setNotice(`Kept local ${pendingUpdate.localName}`);
    }

    setPendingUrlSourceUpdates((updates) => updates.slice(1));
  };

  const scanArchive = async (file: File) => {
    try {
      const archive = await scanArchiveForApp(file);
      setScannedArchive(archive);
      setActiveTab("apps");
      setNotice(`Scanned ${file.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Archive scan failed.");
    }
  };

  const importScannedApp = (fields: Record<ScannedFieldKey, boolean>, addVersion: boolean, applySuggestedDownloadURL: boolean) => {
    if (!scannedArchive || !source) return;
    const scannedApp = scannedArchive.app;
    const targetIndex = source.apps.findIndex((app) => app.bundleIdentifier === scannedApp.bundleIdentifier);
    const patch: Partial<AltApp> = {};
    if (fields.name) patch.name = scannedApp.name;
    if (fields.bundleIdentifier) patch.bundleIdentifier = scannedApp.bundleIdentifier;
    if (fields.marketplaceID) patch.marketplaceID = scannedApp.marketplaceID;

    if (targetIndex === -1) {
      updateSource({
        apps: [
          ...source.apps,
          {
            ...makeApp(),
            ...patch,
            versions: addVersion ? scannedApp.versions : [],
            appPermissions: scannedApp.appPermissions,
          },
        ],
      });
    } else {
      updateSource({
        apps: source.apps.map((app, index) => {
          if (index !== targetIndex) return app;
          const scannedVersion = scannedApp.versions[0];
          const suggestedDownloadURL =
            scannedArchive.type === "adp" ? suggestDownloadUrl(app.versions, scannedVersion.version) : null;
          const version = applySuggestedDownloadURL && suggestedDownloadURL ? { ...scannedVersion, downloadURL: suggestedDownloadURL } : scannedVersion;
          const hasVersion = app.versions.some((item) => item.version === version.version && item.buildVersion === version.buildVersion);
          return {
            ...app,
            ...patch,
            versions: addVersion && !hasVersion ? [version, ...app.versions] : app.versions,
          };
        }),
      });
    }
    setScannedArchive(null);
    setActiveTab("apps");
    setNotice("Imported scanned data");
  };

  const createExample = () => {
    addSource(clone(exampleSource));
    setActiveTab("source");
    setNotice("Created default example repo");
  };

  const toggleTheme = () => setTheme((current) => (current === "light" ? "dark" : "light"));

  const themeToggle = (
    <button className="theme-toggle" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );

  const urlSourceUpdateModal = pendingUrlSourceUpdates[0] ? (
    <UrlSourceUpdateModal
      sourceName={pendingUrlSourceUpdates[0].localName}
      url={pendingUrlSourceUpdates[0].url}
      useLocal={() => resolveUrlSourceUpdate("local")}
      useUrl={() => resolveUrlSourceUpdate("url")}
    />
  ) : null;

  if (!source) {
    return (
      <>
        <HomeScreen
          createExample={createExample}
          importProject={() => importInput.current?.click()}
          importFromUrl={() => setShowImportUrl(true)}
          notice={notice}
          savedSources={store.sources}
          openSource={selectSource}
          themeToggle={themeToggle}
        />
        <input ref={importInput} hidden type="file" accept=".json,.md,.txt" onChange={importJson} />
        {showImportUrl && (
          <ImportUrlModal close={() => setShowImportUrl(false)} importing={importingUrl} importFromUrl={importJsonFromUrl} recentUrls={importUrlHistory} />
        )}
        {pendingImport && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-header">
                <div>
                  <p className="eyebrow">Import source</p>
                  <h2>Name conflict</h2>
                </div>
              </div>
              <p>
                A source named &ldquo;{pendingImport.source.name}&rdquo; already exists. How would you like to proceed?
              </p>
              <div className="button-row">
                <button onClick={() => resolveImport("replace")} type="button">
                  Replace
                </button>
                <button className="secondary" onClick={() => resolveImport("add")} type="button">
                  Add anyway
                </button>
                <button className="secondary" onClick={() => resolveImport("cancel")} type="button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {urlSourceUpdateModal}
      </>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="/alteditor.svg" alt="" />
          <div>
            <h1>AltEditor</h1>
            <span>AltStore PAL repository editor</span>
          </div>
        </div>

        <div className="source-selector">
          <div className="source-selector-row">
            <ImagePreview url={source.iconURL} label="Current source icon" />
            <select
              className="source-switch-dropdown"
              value={store.activeId ?? ""}
              onChange={(e) => selectSource(e.target.value)}
            >
              {store.sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.source.name || "Untitled Source"}
                </option>
              ))}
            </select>
          </div>
          <span className="source-selector-meta">
            {source.subtitle || `${source.apps.length} apps, ${source.news.length} news items`}
          </span>
          <div className="source-selector-actions">
            <button title="New source" onClick={createExample} type="button">
              <Plus size={14} />
            </button>
            <button
              title="Duplicate source"
              onClick={() => store.activeId && duplicateSource(store.activeId)}
              type="button"
            >
              <Copy size={14} />
            </button>
            <button
              title="Delete source"
              onClick={() => store.activeId && requestDeleteSource(store.activeId)}
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <nav className="side-actions" aria-label="Project actions">
          <button onClick={createExample} type="button">
            <Plus size={17} /> New
          </button>
          <button onClick={() => importInput.current?.click()} type="button">
            <Import size={17} /> Import JSON
          </button>
          <button onClick={() => setShowImportUrl(true)} type="button">
            <Import size={17} /> Import URL
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
        {notice && <div className={`notice${noticeFading ? " fading" : ""}`}>{notice}</div>}
        <div className="sidebar-footer">
          {themeToggle}
          <button onClick={() => window.open("https://github.com/tfourj/AltEditor", "_blank")} type="button" className="side-actions-btn">
            <ExternalLink size={17} /> GitHub Repo
          </button>
          <span>created by TfourJ</span>
        </div>
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
      {showImportUrl && (
        <ImportUrlModal close={() => setShowImportUrl(false)} importing={importingUrl} importFromUrl={importJsonFromUrl} recentUrls={importUrlHistory} />
      )}
      {scannedArchive && (
        <ScannedArchiveModal
          app={scannedArchive.app}
          targetApp={source.apps.find((app) => app.bundleIdentifier === scannedArchive.app.bundleIdentifier)}
          suggestedDownloadURL={
            scannedArchive.type === "adp"
              ? suggestDownloadUrl(
                  source.apps.find((app) => app.bundleIdentifier === scannedArchive.app.bundleIdentifier)?.versions ?? [],
                  scannedArchive.app.versions[0].version,
                )
              : null
          }
          close={() => setScannedArchive(null)}
          importToEditor={importScannedApp}
        />
      )}
      {pendingImport && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Import source</p>
                <h2>Name conflict</h2>
              </div>
            </div>
            <p>
              A source named &ldquo;{pendingImport.source.name}&rdquo; already exists. How would you like to proceed?
            </p>
            <div className="button-row">
              <button onClick={() => resolveImport("replace")} type="button">
                Replace
              </button>
              <button className="secondary" onClick={() => resolveImport("add")} type="button">
                Add anyway
              </button>
              <button className="secondary" onClick={() => resolveImport("cancel")} type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {urlSourceUpdateModal}
      {pendingDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Delete source</p>
                <h2>Confirm deletion</h2>
              </div>
            </div>
            <p>
              Delete &ldquo;{pendingDelete.name}&rdquo;? This cannot be undone.
            </p>
            <div className="button-row">
              <button onClick={confirmDeleteSource} type="button">
                Delete
              </button>
              <button className="secondary" onClick={() => setPendingDelete(null)} type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
