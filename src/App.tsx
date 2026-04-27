import { Code2, Download, FileJson, Import, Newspaper, Plus, Smartphone } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { scanArchiveForApp } from "./archiveScanner";
import { AppsEditor } from "./components/AppsEditor";
import { HomeScreen } from "./components/HomeScreen";
import { ImagePreview } from "./components/ImagePreview";
import { CodeModal, ScannedArchiveModal, type ScannedFieldKey } from "./components/Modals";
import { NewsEditor } from "./components/NewsEditor";
import { SourceEditor } from "./components/SourceEditor";
import { ValidationPanel } from "./components/ValidationPanel";
import { clone, downloadText, readStoredSource, storageKey, toFileName } from "./lib/sourceStorage";
import { compactForExport, exampleSource, makeApp, parseSourceText, validateSource } from "./sourceModel";
import type { AltApp, AltSource } from "./types";

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
