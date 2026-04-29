import { useState } from 'react';
import type { RouteInfo, SelectedNode } from '../types';
import { KIND_ICON } from '../graph/constants';
import './DetailPanel.css';

const METHOD_COLOR: Record<string, string> = {
  GET:     '#10b981',
  POST:    '#3b82f6',
  PUT:     '#f59e0b',
  PATCH:   '#8b5cf6',
  DELETE:  '#ef4444',
  ALL:     '#71717a',
  OPTIONS: '#71717a',
  HEAD:    '#71717a',
};

const SCOPE_LABEL: Record<string, string> = {
  DEFAULT:   'Singleton',
  TRANSIENT: 'Transient',
  REQUEST:   'Request',
};

interface Props {
  selected: SelectedNode | null;
  pinned: boolean;
  onPinToggle: () => void;
}

export function DetailPanel({ selected, pinned, onPinToggle }: Props) {
  return (
    <aside className="detail-panel">
      {!selected && <Placeholder />}
      {selected && (
        <button
          className={`detail-panel__pin-btn${pinned ? ' detail-panel__pin-btn--active' : ''}`}
          onClick={onPinToggle}
          title={pinned ? 'Desafixar painel' : 'Fixar painel'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 1l1 1-3 3-1-1 3-3zM7 5l-4 4M9 3L7 5M5 7l-3 3"/>
          </svg>
        </button>
      )}
      {selected?.kind === 'module'    && <ModuleDetail data={selected.data} />}
      {selected?.kind === 'component' && <ComponentDetail data={selected.data} />}
    </aside>
  );
}

function Placeholder() {
  return (
    <div className="detail-panel__placeholder">
      <span className="detail-panel__placeholder-icon">◈</span>
      <span className="detail-panel__placeholder-text">Selecione um nó</span>
    </div>
  );
}

function ModuleDetail({ data }: { data: { name: string; controllers: string[]; providers: string[] } }) {
  return (
    <>
      <NodeHeader icon="⬡" name={data.name} typeLabel="Module" typeColor="var(--module)" />
      <Divider />
      <Section title="Controllers" count={data.controllers.length}>
        {data.controllers.map((c) => <Item key={c} label={c} color="var(--controller)" />)}
      </Section>
      <Section title="Providers" count={data.providers.length}>
        {data.providers.map((p) => <Item key={p} label={p} color="var(--provider)" />)}
      </Section>
    </>
  );
}

function ComponentDetail({ data }: { data: { name: string; type: string; scope: string; dependencies: string[]; routes?: RouteInfo[] } }) {
  const color = data.type === 'controller' ? 'var(--controller)' : 'var(--provider)';
  return (
    <>
      <NodeHeader icon={KIND_ICON[data.type] ?? '◈'} name={data.name} typeLabel={data.type} typeColor={color} scopeLabel={SCOPE_LABEL[data.scope] ?? data.scope} />
      <Divider />
      {data.type === 'controller' && (
        <Section title="Endpoints" count={data.routes?.length ?? 0}>
          <GroupedRoutes routes={data.routes ?? []} />
        </Section>
      )}
      {data.type === 'controller' && <Divider />}
      <Section title="Dependências" count={data.dependencies.length}>
        {data.dependencies.map((d) => <Item key={d} label={d} color="var(--inject)" />)}
      </Section>
    </>
  );
}

function NodeHeader({ icon, name, typeLabel, typeColor, scopeLabel }: {
  icon: string; name: string; typeLabel: string; typeColor: string; scopeLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="detail-panel__header-title-row">
        <span className="detail-panel__header-icon" style={{ color: typeColor }}>{icon}</span>
        <h2 className="detail-panel__header-name">{name}</h2>
        <button className="detail-panel__copy-btn" onClick={copy} title="Copiar nome">
          {copied
            ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--controller)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-5"/></svg>
            : <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="1" width="7" height="8" rx="1"/><path d="M1 4v7a1 1 0 001 1h6"/></svg>
          }
        </button>
      </div>
      <div className="detail-panel__badge-row">
        <Badge label={typeLabel} color={typeColor} />
        {scopeLabel && <Badge label={scopeLabel} color="var(--subtle)" />}
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="detail-panel__section">
      <div className="detail-panel__section-header">
        <span className="detail-panel__section-title">{title}</span>
        <span className="detail-panel__section-count">{count}</span>
      </div>
      {count === 0
        ? <span className="detail-panel__empty">—</span>
        : <div className="detail-panel__list">{children}</div>}
    </div>
  );
}

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function GroupedRoutes({ routes }: { routes: RouteInfo[] }) {
  const groups = new Map<string, string[]>();
  for (const r of routes) {
    if (!groups.has(r.method)) groups.set(r.method, []);
    groups.get(r.method)!.push(r.path);
  }

  const sorted = [...groups.entries()].sort(([a], [b]) => {
    const ai = METHOD_ORDER.indexOf(a);
    const bi = METHOD_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <>
      {sorted.map(([method, paths]) => {
        const color = METHOD_COLOR[method] ?? '#71717a';
        return (
          <div key={method} className="detail-panel__route-group">
            <div className="detail-panel__route-group-header">
              <span className="detail-panel__route-method" style={{ '--method-color': color } as React.CSSProperties}>
                {method}
              </span>
              <span className="detail-panel__route-group-count">{paths.length}</span>
            </div>
            <div className="detail-panel__route-group-paths">
              {paths.map((path) => (
                <div key={path} className="detail-panel__route-path-item" style={{ '--method-color': color } as React.CSSProperties}>
                  {path}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function Item({ label, color }: { label: string; color: string }) {
  return (
    <div className="detail-panel__item" style={{ '--item-color': color } as React.CSSProperties}>
      <span className="detail-panel__item-label">{label}</span>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="detail-panel__badge" style={{ '--badge-color': color } as React.CSSProperties}>
      {label}
    </span>
  );
}

function Divider() {
  return <div className="detail-panel__divider" />;
}
