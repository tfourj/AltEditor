import { Plus, Trash2 } from "lucide-react";

import { makeNewsItem } from "../sourceModel";
import type { AltNewsItem, AltSource } from "../types";
import { AppBundleSelect } from "./AppBundleSelect";
import { Field } from "./Fields";
import { ImagePreview } from "./ImagePreview";

export function NewsEditor({ source, updateSource }: { source: AltSource; updateSource: (patch: Partial<AltSource>) => void }) {
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
            <Field label="Title" value={item.title} onChange={(title) => updateNews(index, { title })} />
            <Field label="Identifier" value={item.identifier} onChange={(identifier) => updateNews(index, { identifier })} />
            <Field label="Caption" value={item.caption} onChange={(caption) => updateNews(index, { caption })} />
            <Field label="Date" value={item.date} onChange={(date) => updateNews(index, { date })} />
            <Field label="Tint color" value={item.tintColor} onChange={(tintColor) => updateNews(index, { tintColor })} />
            <Field label="Image URL" value={item.imageURL} onChange={(imageURL) => updateNews(index, { imageURL })} />
            <Field label="URL" value={item.url} onChange={(url) => updateNews(index, { url })} />
            <AppBundleSelect apps={source.apps} label="App" value={item.appID} onChange={(appID) => updateNews(index, { appID })} />
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
