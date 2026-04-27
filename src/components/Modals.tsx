import { Copy } from "lucide-react";
import { useState } from "react";

import { formatBytes } from "../lib/images";
import type { AltApp } from "../types";

export function CodeModal({ code, close }: { code: string; close: () => void }) {
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
            <button className="secondary" onClick={close} type="button">
              Close
            </button>
          </div>
        </div>
        <pre>{code}</pre>
      </div>
    </div>
  );
}

export type ScannedFieldKey = "name" | "bundleIdentifier" | "marketplaceID";

export function ScannedArchiveModal({
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
  const versionExists = Boolean(targetApp?.versions.some((item) => item.version === version.version && item.buildVersion === version.buildVersion));
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
          <button className="secondary" onClick={close} type="button">
            Close
          </button>
        </div>

        <p className="block-header">Select which data from the ipa file you want to import into the editor</p>
        <div className="scan-list">
          {[
            ["name", "Name", app.name],
            ["bundleIdentifier", "Bundle ID", app.bundleIdentifier],
            ["marketplaceID", "Marketplace ID", app.marketplaceID],
          ].map(([key, label, value]) => (
            <label className="scan-check-row" key={key}>
              <input checked={fields[key as ScannedFieldKey]} disabled={!value} type="checkbox" onChange={() => toggleField(key as ScannedFieldKey)} />
              <span>
                <small>{label}</small>
                {value || "Not found"}
              </span>
            </label>
          ))}
          <button disabled={!canImportFields && !canAddVersion} onClick={() => importToEditor(fields, canAddVersion)} type="button">
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
