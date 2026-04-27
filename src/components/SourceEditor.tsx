import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { compactStringList, sameStringArray } from "../lib/draftLists";
import type { AltSource } from "../types";
import { AppBundleSelect } from "./AppBundleSelect";
import { Field } from "./Fields";
import { ImagePreview } from "./ImagePreview";

function FeaturedAppsEditor({ source, updateSource }: { source: AltSource; updateSource: (patch: Partial<AltSource>) => void }) {
  const [featuredDrafts, setFeaturedDrafts] = useState<string[]>(source.featuredApps.length ? source.featuredApps : [""]);

  useEffect(() => {
    if (!sameStringArray(compactStringList(featuredDrafts), source.featuredApps)) {
      setFeaturedDrafts(source.featuredApps.length ? source.featuredApps : [""]);
    }
  }, [featuredDrafts, source.featuredApps]);

  const updateFeaturedApps = (apps: string[]) => {
    setFeaturedDrafts(apps.length ? apps : [""]);
    updateSource({ featuredApps: apps.filter(Boolean) });
  };

  return (
    <div className="app-reference-panel">
      <div className="permission-header">
        <h3>Featured apps</h3>
        <button className="small-button" onClick={() => setFeaturedDrafts([...featuredDrafts, ""])} type="button">
          <Plus size={15} /> Add featured app
        </button>
      </div>
      <div className="app-reference-list">
        {featuredDrafts.map((bundleIdentifier, index) => (
          <div className="app-reference-row" key={`${bundleIdentifier}-${index}`}>
            <AppBundleSelect
              apps={source.apps}
              label="App"
              value={bundleIdentifier}
              onChange={(value) => updateFeaturedApps(featuredDrafts.map((item, itemIndex) => (itemIndex === index ? value : item)))}
            />
            <button
              className="icon-button danger"
              onClick={() => updateFeaturedApps(featuredDrafts.filter((_, itemIndex) => itemIndex !== index))}
              type="button"
              aria-label="Remove featured app"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      {!source.apps.some((app) => app.bundleIdentifier.trim()) && <div className="empty slim">Add an app with a bundle identifier first</div>}
    </div>
  );
}

export function SourceEditor({ source, updateSource }: { source: AltSource; updateSource: (patch: Partial<AltSource>) => void }) {
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
        <Field label="Name" value={source.name} onChange={(name) => updateSource({ name })} />
        <Field label="Subtitle" value={source.subtitle} onChange={(subtitle) => updateSource({ subtitle })} />
      </div>
      <Field label="Description" value={source.description} onChange={(description) => updateSource({ description })} textarea />
      <div className="grid two">
        <Field label="Icon URL" value={source.iconURL} onChange={(iconURL) => updateSource({ iconURL })} />
        <Field label="Header URL" value={source.headerURL} onChange={(headerURL) => updateSource({ headerURL })} />
        <Field label="Website" value={source.website} onChange={(website) => updateSource({ website })} />
        <Field label="Patreon URL" value={source.patreonURL} onChange={(patreonURL) => updateSource({ patreonURL })} />
        <Field label="Fediverse username" value={source.fediUsername} onChange={(fediUsername) => updateSource({ fediUsername })} />
        <Field label="Tint color" value={source.tintColor} onChange={(tintColor) => updateSource({ tintColor })} type="text" placeholder="#6156e2" />
      </div>
      <FeaturedAppsEditor source={source} updateSource={updateSource} />
    </section>
  );
}
