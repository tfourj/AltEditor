import { FileArchive, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { compactStringList, samePrivacyEntries, sameStringArray, toPrivacyRecord } from "../lib/draftLists";
import { categories, makeApp, makePermissions, makeVersion } from "../sourceModel";
import type { AltApp, AltSource, AltVersion } from "../types";
import { Field, NumberField } from "./Fields";
import { ImagePreview } from "./ImagePreview";
import { ScreenshotEditor } from "./ScreenshotEditor";

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
        <Field label="Version" value={version.version} onChange={(value) => updateVersion({ version: value })} />
        <Field label="Build" value={version.buildVersion} onChange={(buildVersion) => updateVersion({ buildVersion })} />
        <Field label="Date" value={version.date} onChange={(date) => updateVersion({ date })} />
      </div>
      <Field label="Download URL" value={version.downloadURL} onChange={(downloadURL) => updateVersion({ downloadURL })} />
      <div className="grid three">
        <NumberField label="Size" value={version.size} onChange={(size) => updateVersion({ size })} />
        <Field label="Min iOS" value={version.minOSVersion} onChange={(minOSVersion) => updateVersion({ minOSVersion })} />
        <Field label="Max iOS" value={version.maxOSVersion} onChange={(maxOSVersion) => updateVersion({ maxOSVersion })} />
      </div>
      <Field label="Release notes" value={version.localizedDescription} onChange={(localizedDescription) => updateVersion({ localizedDescription })} textarea />
    </div>
  );
}

function PermissionEditor({ app, updateApp }: { app: AltApp; updateApp: (patch: Partial<AltApp>) => void }) {
  const permissions = app.appPermissions ?? makePermissions();
  const privacyRecordEntries = Object.entries(permissions.privacy);
  const appEntitlements = permissions.entitlements;
  const appPrivacyEntries: Array<[string, string]> = privacyRecordEntries.length ? privacyRecordEntries : [];
  const [entitlementDrafts, setEntitlementDrafts] = useState<string[]>(appEntitlements.length ? appEntitlements : [""]);
  const [privacyDrafts, setPrivacyDrafts] = useState<Array<[string, string]>>(appPrivacyEntries.length ? appPrivacyEntries : [["", ""]]);

  useEffect(() => {
    if (!sameStringArray(compactStringList(entitlementDrafts), appEntitlements)) {
      setEntitlementDrafts(appEntitlements.length ? appEntitlements : [""]);
    }
  }, [appEntitlements, entitlementDrafts]);

  useEffect(() => {
    if (!samePrivacyEntries(Object.entries(toPrivacyRecord(privacyDrafts)), appPrivacyEntries)) {
      setPrivacyDrafts(appPrivacyEntries.length ? appPrivacyEntries : [["", ""]]);
    }
  }, [appPrivacyEntries, privacyDrafts]);

  const updateEntitlements = (items: string[]) => {
    setEntitlementDrafts(items.length ? items : [""]);
    updateApp({
      appPermissions: {
        ...permissions,
        entitlements: compactStringList(items),
      },
    });
  };

  const updatePrivacy = (entries: Array<[string, string]>) => {
    setPrivacyDrafts(entries.length ? entries : [["", ""]]);
    updateApp({
      appPermissions: {
        ...permissions,
        privacy: toPrivacyRecord(entries),
      },
    });
  };

  return (
    <div className="permission-editor">
      <div className="permission-panel">
        <div className="permission-header">
          <h3>Entitlements</h3>
          <button className="small-button" onClick={() => setEntitlementDrafts([...entitlementDrafts, ""])} type="button">
            <Plus size={15} /> Add entitlement
          </button>
        </div>
        <div className="permission-list">
          {entitlementDrafts.map((entitlement, entitlementIndex) => (
            <div className="permission-row entitlement-row" key={entitlementIndex}>
              <label className="field">
                <span>Key</span>
                <input
                  value={entitlement}
                  placeholder="com.apple.developer.networking.wifi-info"
                  onChange={(event) =>
                    updateEntitlements(entitlementDrafts.map((item, itemIndex) => (itemIndex === entitlementIndex ? event.target.value : item)))
                  }
                />
              </label>
              <button
                className="icon-button danger"
                onClick={() => updateEntitlements(entitlementDrafts.filter((_, itemIndex) => itemIndex !== entitlementIndex))}
                type="button"
                aria-label="Remove entitlement"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="permission-panel">
        <div className="permission-header">
          <h3>Privacy permissions</h3>
          <button className="small-button" onClick={() => setPrivacyDrafts([...privacyDrafts, ["", ""]])} type="button">
            <Plus size={15} /> Add permission
          </button>
        </div>
        <div className="permission-list">
          {privacyDrafts.map(([key, value], privacyIndex) => (
            <div className="permission-row privacy-row" key={privacyIndex}>
              <label className="field">
                <span>Key</span>
                <input
                  value={key}
                  placeholder="NSCameraUsageDescription"
                  onChange={(event) =>
                    updatePrivacy(
                      privacyDrafts.map((entry, itemIndex) =>
                        itemIndex === privacyIndex ? ([event.target.value, entry[1]] as [string, string]) : entry,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>Value</span>
                <input
                  value={value}
                  placeholder="Reason shown to users"
                  onChange={(event) =>
                    updatePrivacy(
                      privacyDrafts.map((entry, itemIndex) =>
                        itemIndex === privacyIndex ? ([entry[0], event.target.value] as [string, string]) : entry,
                      ),
                    )
                  }
                />
              </label>
              <button
                className="icon-button danger"
                onClick={() => updatePrivacy(privacyDrafts.filter((_, itemIndex) => itemIndex !== privacyIndex))}
                type="button"
                aria-label="Remove privacy permission"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
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
        <button
          className="icon-button danger"
          onClick={(event) => {
            event.preventDefault();
            removeApp();
          }}
          type="button"
          aria-label="Remove app"
        >
          <Trash2 size={16} />
        </button>
      </summary>
      <div className="grid two">
        <Field label="Name" value={app.name} onChange={(name) => updateApp({ name })} />
        <Field label="Bundle identifier" value={app.bundleIdentifier} onChange={(bundleIdentifier) => updateApp({ bundleIdentifier })} />
        <Field label="Marketplace ID" value={app.marketplaceID} onChange={(marketplaceID) => updateApp({ marketplaceID })} />
        <Field label="Developer" value={app.developerName} onChange={(developerName) => updateApp({ developerName })} />
        <Field label="Subtitle" value={app.subtitle} onChange={(subtitle) => updateApp({ subtitle })} />
        <Field label="Icon URL" value={app.iconURL} onChange={(iconURL) => updateApp({ iconURL })} />
        <Field label="Tint color" value={app.tintColor} onChange={(tintColor) => updateApp({ tintColor })} />
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
      <Field label="Localized description" value={app.localizedDescription} onChange={(localizedDescription) => updateApp({ localizedDescription })} textarea />
      <ScreenshotEditor app={app} updateApp={updateApp} />

      <div className="subsection-title">
        <h3>Versions</h3>
        <button className="small-button" onClick={() => updateApp({ versions: [...app.versions, makeVersion()] })} type="button">
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

      <PermissionEditor app={app} updateApp={updateApp} />

      <div className="subsection-title">
        <h3>Patreon</h3>
        <label className="toggle">
          <input type="checkbox" checked={Boolean(app.patreon)} onChange={(event) => updateApp({ patreon: event.target.checked ? {} : undefined })} />
          Enabled
        </label>
      </div>
      {app.patreon && (
        <div className="grid four">
          <NumberField label="Pledge" value={Number(app.patreon.pledge ?? 0)} onChange={(pledge) => updateApp({ patreon: { ...app.patreon, pledge } })} />
          <Field label="Currency" value={app.patreon.currency} onChange={(currency) => updateApp({ patreon: { ...app.patreon, currency } })} />
          <Field label="Benefit" value={app.patreon.benefit} onChange={(benefit) => updateApp({ patreon: { ...app.patreon, benefit } })} />
          <Field
            label="Tiers"
            value={app.patreon.tiers?.join(",")}
            onChange={(tiers) => updateApp({ patreon: { ...app.patreon, tiers: tiers.split(",").map((item) => item.trim()).filter(Boolean) } })}
          />
        </div>
      )}
    </details>
  );
}

export function AppsEditor({
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
