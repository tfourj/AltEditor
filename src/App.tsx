import { Code2, Copy, Download, ExternalLink, FileJson, Import, Newspaper, Plus, Smartphone, Trash2 } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { scanArchiveForApp } from "./archiveScanner";
import { AppsEditor } from "./components/AppsEditor";
import { HomeScreen } from "./components/HomeScreen";
import { ImagePreview } from "./components/ImagePreview";
import { CodeModal, ImportUrlModal, ScannedArchiveModal, type ScannedFieldKey } from "./components/Modals";
import { NewsEditor } from "./components/NewsEditor";
import { SourceEditor } from "./components/SourceEditor";
import { ValidationPanel } from "./components/ValidationPanel";
import { clone, downloadText, generateId, readSourcesStore, toFileName, writeSourcesStore, type SourcesStore } from "./lib/sourceStorage";
import { compactForExport, exampleSource, makeApp, parseSourceText, validateSource } from "./sourceModel";
import type { AltApp, AltSource } from "./types";

const IMPORT_URL_HISTORY_KEY = "alteditor.importUrlHistory";

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
  const [activeTab, setActiveTab] = useState<"source" | "apps" | "news">("source");
  const [showCode, setShowCode] = useState(false);
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [importingUrl, setImportingUrl] = useState(false);
  const [importUrlHistory, setImportUrlHistory] = useState(readImportUrls);
  const [scannedApp, setScannedApp] = useState<AltApp | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeFading, setNoticeFading] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ source: AltSource; fileName: string } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

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
    if (!notice) return;
    setNoticeFading(false);
    const fadeTimeout = window.setTimeout(() => setNoticeFading(true), 4500);
    const clearTimeout = window.setTimeout(() => setNotice(""), 5000);
    return () => {
      window.clearTimeout(fadeTimeout);
      window.clearTimeout(clearTimeout);
    };
  }, [notice]);

  const addSource = (newSource: AltSource) => {
    const id = generateId();
    setStore((prev) => ({
      sources: [...prev.sources, { id, source: newSource, lastModified: Date.now() }],
      activeId: id,
    }));
  };

  const selectSource = (id: string) =>
    setStore((prev) => (prev.sources.some((s) => s.id === id) ? { ...prev, activeId: id } : prev));

  const deleteSource = (id: string) => {
    setStore((prev) => {
      const nextSources = prev.sources.filter((s) => s.id !== id);
      return {
        sources: nextSources,
        activeId: prev.activeId === id ? (nextSources[0]?.id ?? null) : prev.activeId,
      };
    });
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

  const importSourceText = (text: string, label: string) => {
    const parsed = parseSourceText(text);
    const existing = store.sources.find((s) => s.source.name === parsed.name);
    if (existing) {
      setPendingImport({ source: parsed, fileName: label });
      return;
    }
    addSource(parsed);
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
      importSourceText(await response.text(), parsedUrl.toString());
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
            s.id === existing.id ? { ...s, source: pendingImport.source, lastModified: Date.now() } : s,
          ),
          activeId: existing.id,
        }));
        setNotice(`Replaced '${pendingImport.source.name}'`);
      }
    } else if (action === "add") {
      addSource(pendingImport.source);
      setNotice(`Imported ${pendingImport.fileName}`);
    } else {
      setNotice("Import cancelled");
    }
    setPendingImport(null);
    setActiveTab("source");
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
    if (!scannedApp || !source) return;
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
          const version = scannedApp.versions[0];
          const hasVersion = app.versions.some((item) => item.version === version.version && item.buildVersion === version.buildVersion);
          return {
            ...app,
            ...patch,
            versions: addVersion && !hasVersion ? [version, ...app.versions] : app.versions,
          };
        }),
      });
    }
    setScannedApp(null);
    setActiveTab("apps");
    setNotice("Imported scanned data");
  };

  const createExample = () => {
    addSource(clone(exampleSource));
    setActiveTab("source");
    setNotice("Created default example repo");
  };

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
              onClick={() => store.activeId && deleteSource(store.activeId)}
              disabled={store.sources.length <= 1}
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
      {scannedApp && (
        <ScannedArchiveModal
          app={scannedApp}
          targetApp={source.apps.find((app) => app.bundleIdentifier === scannedApp.bundleIdentifier)}
          close={() => setScannedApp(null)}
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
    </div>
  );
}
