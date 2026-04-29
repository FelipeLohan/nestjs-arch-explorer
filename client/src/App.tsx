import { useState, useEffect, useCallback, useRef } from 'react';
import { ArchGraph } from './components/ArchGraph';
import { DetailPanel } from './components/DetailPanel';
import type { ArchitectureMap, SelectedNode } from './types';
import './App.css';

export default function App() {
  const [map, setMap] = useState<ArchitectureMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [pinned, setPinned] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/explorer-data')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<ArchitectureMap>; })
      .then(setMap)
      .catch((e: Error) => setError(e.message));
  }, []);

  const handleSelect = useCallback((node: SelectedNode | null) => {
    if (node === null && pinned) return;
    setSelected(node);
  }, [pinned]);

  const handleSearchKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setSearch(''); searchRef.current?.blur(); }
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
          <div className="app-search">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="5" cy="5" r="4"/><path d="M9 9l2 2"/>
            </svg>
            <input
              ref={searchRef}
              className="app-search__input"
              placeholder="Buscar node…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
            />
            {search && (
              <button className="app-search__clear" onClick={() => setSearch('')} title="Limpar">✕</button>
            )}
          </div>
        )}

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
            <ArchGraph map={map} search={search} onSelect={handleSelect} />
            <DetailPanel
              selected={selected}
              pinned={pinned}
              onPinToggle={() => setPinned((p) => !p)}
            />
          </>
        )}
      </div>
    </div>
  );
}
