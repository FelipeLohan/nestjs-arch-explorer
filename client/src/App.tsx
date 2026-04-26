import { useState, useEffect } from 'react';
import { ArchGraph } from './components/ArchGraph';
import { DetailPanel } from './components/DetailPanel';
import type { ArchitectureMap, SelectedNode } from './types';
import './App.css';

export default function App() {
  const [map, setMap] = useState<ArchitectureMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedNode | null>(null);

  useEffect(() => {
    fetch('/explorer-data')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<ArchitectureMap>; })
      .then(setMap)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="var(--module)" strokeWidth="1.5"/>
          <circle cx="8" cy="8" r="3" fill="var(--module)" opacity=".5"/>
        </svg>
        <span className="app-header__title">NestJS Arch Explorer</span>

        {map && (
          <div className="app-header__stats">
            {[
              { label: 'modules',     count: map.modules.length,     color: 'var(--module)' },
              { label: 'controllers', count: map.controllers.length, color: 'var(--controller)' },
              { label: 'providers',   count: map.providers.length,   color: 'var(--provider)' },
            ].map(({ label, count, color }) => (
              <span key={label} className="app-stat-badge">
                <span className="app-stat-badge__dot" style={{ background: color }} />
                {count} {label}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="app-body">
        {error && (
          <div className="app-error">
            <span className="app-error__icon">⚠</span>
            <span className="app-error__text">
              Falha ao carregar: <code style={{ color: '#f87171' }}>{error}</code>
            </span>
          </div>
        )}
        {!map && !error && <div className="app-loading">Carregando…</div>}
        {map && (
          <>
            <ArchGraph map={map} onSelect={setSelected} />
            <DetailPanel selected={selected} />
          </>
        )}
      </div>
    </div>
  );
}
