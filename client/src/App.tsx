import { useState, useEffect } from 'react';
import { ArchGraph } from './components/ArchGraph';
import { DetailPanel } from './components/DetailPanel';
import type { ArchitectureMap, SelectedNode } from './types';

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--text)' }}>

      {/* ── Header ── */}
      <header style={{ height: 48, padding: '0 20px', background: 'var(--surface)', borderBottom: '1px solid var(--surface2)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="var(--module)" strokeWidth="1.5"/>
          <circle cx="8" cy="8" r="3" fill="var(--module)" opacity=".5"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--text)' }}>
          NestJS Arch Explorer
        </span>

        {map && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {[
              { label: 'modules',     count: map.modules.length,     color: 'var(--module)' },
              { label: 'controllers', count: map.controllers.length, color: 'var(--controller)' },
              { label: 'providers',   count: map.providers.length,   color: 'var(--provider)' },
            ].map(({ label, count, color }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {count} {label}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {error && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚠</span>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Falha ao carregar: <code style={{ color: '#f87171' }}>{error}</code></span>
          </div>
        )}
        {!map && !error && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--subtle)', fontSize: 13 }}>
            Carregando…
          </div>
        )}
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
