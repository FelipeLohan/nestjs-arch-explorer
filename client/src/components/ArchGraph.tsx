import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Background, MiniMap, Panel,
  useNodesState, useEdgesState, BackgroundVariant,
  type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ArchitectureMap, SelectedNode } from '../types';
import { ArchNode } from '../graph/ArchNode';
import { GroupNode } from '../graph/GroupNode';
import { buildNodes } from '../graph/node-builder';
import { buildEdges } from '../graph/edge-builder';
import { applyDagreLayout } from '../graph/layout';
import { buildGroupedElements } from '../graph/grouped-builder';
import { KIND_COLOR } from '../graph/constants';
import { HoverContext } from '../graph/hover-context';
import { buildDrawioXml } from '../graph/export-drawio';

const nodeTypes = { archNode: ArchNode, groupNode: GroupNode };

function buildElements(map: ArchitectureMap, grouped: boolean) {
  if (grouped) return buildGroupedElements(map);
  const { nodes: raw, seen } = buildNodes(map);
  const { edges } = buildEdges(map, seen);
  return { nodes: applyDagreLayout(raw, edges), edges };
}

/**
 * Directional 2-hop traversal — mirrors the architecture hierarchy:
 *   module     → contains children → providers those children inject
 *   controller → parent module    + providers it injects
 *   provider   → injectors        → modules of those injectors
 */
function computeHighlightedIds(
  hoveredId: string,
  hoveredKind: string,
  edges: Edge[],
): Set<string> {
  const ids = new Set([hoveredId]);
  const inject   = (e: Edge) => !!e.animated;   // orange inject arrows
  const contains = (e: Edge) => !e.animated;    // gray contains arrows

  if (hoveredKind === 'module') {
    // hop 1: direct children (controllers + providers) via contains edges
    const children = new Set<string>();
    for (const e of edges)
      if (contains(e) && e.source === hoveredId) { ids.add(e.target); children.add(e.target); }

    // hop 2: providers those children inject
    for (const e of edges)
      if (inject(e) && children.has(e.source)) ids.add(e.target);

  } else if (hoveredKind === 'controller') {
    // hop 1 up: module that owns this controller
    for (const e of edges)
      if (contains(e) && e.target === hoveredId) ids.add(e.source);

    // hop 1 down: providers this controller injects
    for (const e of edges)
      if (inject(e) && e.source === hoveredId) ids.add(e.target);

  } else {
    // provider — hop 1: everything that injects this provider
    const injectors = new Set<string>();
    for (const e of edges)
      if (inject(e) && e.target === hoveredId) { ids.add(e.source); injectors.add(e.source); }

    // hop 2: modules that own those injectors + any module that directly contains this provider
    for (const e of edges)
      if (contains(e) && (injectors.has(e.target) || e.target === hoveredId)) ids.add(e.source);
  }

  return ids;
}

interface Props {
  map: ArchitectureMap;
  search: string;
  onSelect: (node: SelectedNode | null) => void;
}

export function ArchGraph({ map, search, onSelect }: Props) {
  const graphRef = useRef<HTMLDivElement>(null);
  const [grouped, setGrouped] = useState(false);
  const [hiddenKinds, setHiddenKinds] = useState<Set<string>>(new Set());

  const toggleKind = useCallback((kind: string) => {
    setHiddenKinds((prev) => {
      const next = new Set(prev);
      next.has(kind) ? next.delete(kind) : next.add(kind);
      return next;
    });
  }, []);

  const { nodes: ln, edges: le } = useMemo(() => buildElements(map, grouped), [map, grouped]);
  const [nodes, , onNodesChange] = useNodesState(ln);
  const [edges, , onEdgesChange] = useEdgesState(le);

  /* ── hover state ──────────────────────────────────────────── */
  const [hovered, setHovered] = useState<{ id: string; kind: string } | null>(null);

  const highlightedIds = useMemo(
    () => hovered ? computeHighlightedIds(hovered.id, hovered.kind, edges) : new Set<string>(),
    [hovered, edges],
  );

  const searchIds = useMemo<Set<string> | null>(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return new Set(nodes.map((n) => n.id).filter((id) => id.toLowerCase().includes(q)));
  }, [search, nodes]);

  const hiddenNodeIds = useMemo(() => {
    if (hiddenKinds.size === 0) return new Set<string>();
    return new Set(nodes.filter((n) => hiddenKinds.has(n.data?.kind as string)).map((n) => n.id));
  }, [nodes, hiddenKinds]);

  const displayNodes = useMemo(() => {
    if (hiddenKinds.size === 0) return nodes;
    return nodes.map((n) => ({ ...n, hidden: hiddenKinds.has(n.data?.kind as string) }));
  }, [nodes, hiddenKinds]);

  const displayEdges = useMemo(() => {
    const activeIds = hovered ? highlightedIds : searchIds;
    return edges.map((e) => {
      if (hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target))
        return { ...e, hidden: true };
      if (!activeIds) return e;
      const lit = activeIds.has(e.source) && activeIds.has(e.target);
      return { ...e, style: { ...e.style, opacity: lit ? 1 : 0.06 } };
    });
  }, [hovered, highlightedIds, searchIds, edges, hiddenNodeIds]);

  /* ── handlers ─────────────────────────────────────────────── */
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHovered({ id: node.id, kind: node.data.kind as string });
  }, []);

  const onNodeMouseLeave = useCallback(() => setHovered(null), []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const kind = node.data.kind as string;
    if (kind === 'module') {
      const mod = map.modules.find((m) => m.name === node.id);
      if (mod) onSelect({ kind: 'module', data: mod });
    } else {
      const comp =
        map.controllers.find((c) => c.name === node.id) ??
        map.providers.find((p) => p.name === node.id);
      if (comp) onSelect({ kind: 'component', data: comp });
    }
  }, [map, onSelect]);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Element)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const downloadPng = useCallback(() => {
    if (!graphRef.current) return;
    setExportOpen(false);
    void import('html-to-image')
      .then(({ toPng }) => toPng(graphRef.current!, { backgroundColor: '#09090b', pixelRatio: 2 }))
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.download = 'architecture.png';
        a.href = dataUrl;
        a.click();
      });
  }, []);

  const downloadDrawio = useCallback(() => {
    setExportOpen(false);
    const xml = buildDrawioXml(nodes, edges);
    const blob = new Blob([xml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.download = 'architecture.drawio';
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }, [nodes, edges]);

  const downloadSvg = useCallback(() => {
    if (!graphRef.current) return;
    setExportOpen(false);
    void import('html-to-image')
      .then(({ toSvg }) => toSvg(graphRef.current!, { backgroundColor: '#09090b' }))
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.download = 'architecture.svg';
        a.href = dataUrl;
        a.click();
      });
  }, []);

  const downloadJson = useCallback(() => {
    setExportOpen(false);
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = 'architecture.json';
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }, [map]);

  /* ── render ───────────────────────────────────────────────── */
  return (
    <HoverContext.Provider value={{ hoveredId: hovered?.id ?? null, highlightedIds, searchIds }}>
      <div ref={graphRef} style={{ flex: 1, height: '100%' }}>
        <ReactFlow
          nodes={displayNodes} edges={displayEdges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onPaneClick={() => onSelect(null)}
          nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.15 }}
          minZoom={0.08} maxZoom={2.5}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
          <MiniMap
            zoomable pannable
            nodeColor={(n) => KIND_COLOR[n.data?.kind as string] ?? '#52525b'}
            nodeStrokeWidth={0} nodeBorderRadius={4} maskColor="rgba(9,9,11,0.75)"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8 }} />

          <Panel position="top-right" style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            background: 'var(--surface)', border: '1px solid var(--surface2)',
            borderRadius: 8, padding: '8px 12px', fontSize: 10,
          }}>
            {Object.entries(KIND_COLOR).map(([kind, color]) => {
              const hidden = hiddenKinds.has(kind);
              return (
                <button key={kind} onClick={() => toggleKind(kind)} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: hidden ? 'var(--subtle)' : 'var(--muted)',
                  opacity: hidden ? 0.5 : 1, transition: 'opacity .15s, color .15s',
                  textAlign: 'left',
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                    background: hidden ? 'var(--subtle)' : color,
                    transition: 'background .15s',
                  }} />
                  {kind}
                </button>
              );
            })}
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, paddingTop: 6, borderTop: '1px solid var(--surface2)', color: 'var(--muted)' }}>
              <span style={{ width: 18, borderTop: '2px solid #f97316', flexShrink: 0 }} />
              injects
            </span>
            <button onClick={() => setGrouped((g) => !g)} style={{
              marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--surface2)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 0',
              color: grouped ? 'var(--module)' : 'var(--subtle)',
              fontSize: 10, display: 'flex', alignItems: 'center', gap: 6,
              transition: 'color .15s', textAlign: 'left',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <rect x="1" y="1" width="8" height="8" rx="2"/>
                <path d="M1 4h8"/>
              </svg>
              {grouped ? 'Flat view' : 'Group by module'}
            </button>
          </Panel>

          <Panel position="bottom-center">
            <div ref={exportRef} className="export-dropdown">
              <button className="rf-panel-btn" onClick={() => setExportOpen((o) => !o)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 1v7M3 6l3 3 3-3M1 11h10" />
                </svg>
                Export
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ marginLeft: 2, transform: exportOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
                  <path d="M1 2.5l3 3 3-3" />
                </svg>
              </button>
              {exportOpen && (
                <div className="export-menu">
                  <button className="export-menu__item" onClick={downloadPng}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 1v7M3 6l3 3 3-3M1 11h10" />
                    </svg>
                    PNG
                  </button>
                  <button className="export-menu__item" onClick={downloadDrawio}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="1" width="10" height="10" rx="2" />
                      <path d="M4 6h4M6 4v4" />
                    </svg>
                    Draw.io
                  </button>
                  <button className="export-menu__item" onClick={downloadSvg}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 9c1-2 2-3 3-3s2 2 3 2 2-2 4-4" />
                    </svg>
                    SVG
                  </button>
                  <button className="export-menu__item" onClick={downloadJson}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 2C2 2 1 3 1 4v1c0 1-1 1-1 1s1 0 1 1v1c0 1 1 2 2 2M9 2c1 0 2 1 2 2v1c0 1 1 1 1 1s-1 0-1 1v1c0 1-1 2-2 2" />
                    </svg>
                    JSON
                  </button>
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </HoverContext.Provider>
  );
}
