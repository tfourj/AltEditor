import type { AltApp } from "../types";

const appLabel = (app: AltApp): string => [app.name || "Untitled app", app.bundleIdentifier].filter(Boolean).join(" - ");

export function AppBundleSelect({
  apps,
  label,
  value,
  onChange,
  allowBlank = true,
}: {
  apps: AltApp[];
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  allowBlank?: boolean;
}) {
  const appOptions = apps.filter((app) => app.bundleIdentifier.trim());
  const valueIsKnown = !value || appOptions.some((app) => app.bundleIdentifier === value);

  return (
    <label className="field">
      <span>{label}</span>
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value)} disabled={!appOptions.length}>
        {allowBlank && <option value="">No app selected</option>}
        {!valueIsKnown && <option value={value}>{value}</option>}
        {appOptions.map((app) => (
          <option key={app.bundleIdentifier} value={app.bundleIdentifier}>
            {appLabel(app)}
          </option>
        ))}
      </select>
    </label>
  );
}
