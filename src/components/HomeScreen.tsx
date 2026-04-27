import { Import, Pencil, Plus } from "lucide-react";
import type { StoredSource } from "../lib/sourceStorage";

export function HomeScreen({
  createExample,
  importProject,
  notice,
  savedSources,
  openSource,
}: {
  createExample: () => void;
  importProject: () => void;
  notice: string;
  savedSources: StoredSource[];
  openSource: (id: string) => void;
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

        {savedSources.length > 0 && (
          <div className="saved-sources-section">
            <p className="eyebrow">Saved Sources</p>
            {savedSources.map((s) => (
              <button
                key={s.id}
                className="saved-source-item"
                onClick={() => openSource(s.id)}
                type="button"
              >
                <Pencil size={15} />
                <span>{s.source.name || "Untitled Source"}</span>
                <small>{s.source.apps.length} apps, {s.source.news.length} news</small>
              </button>
            ))}
          </div>
        )}

        <div className="home-copy">
          <p className="eyebrow">Start</p>
          <h2>Create or import a repository</h2>
          <p>Open an existing AltStore source JSON file or start from the default example repo.</p>
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
