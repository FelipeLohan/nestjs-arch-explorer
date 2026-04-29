import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { ArchitectureMap } from '../types';
import { nodeWidth, nodeHeight } from './constants';
import dagre from '@dagrejs/dagre';

const PADDING    = 14;
const GAP        = 6;
const HEADER_H   = 36;

const injectsMarker = { type: MarkerType.ArrowClosed, color: '#f97316', width: 10, height: 10 };

export function buildGroupedElements(map: ArchitectureMap): { nodes: Node[]; edges: Edge[] } {
  const allNodes: Node[] = [];
  const seenChildren = new Set<string>();

  for (const mod of map.modules) {
    const childNodes: Node[] = [];

    for (const ctrlName of mod.controllers) {
      if (seenChildren.has(ctrlName)) continue;
      seenChildren.add(ctrlName);
      const ctrl = map.controllers.find((c) => c.name === ctrlName);
      const sub  = [
        ctrl?.routes?.length      && `${ctrl.routes.length} routes`,
        ctrl?.dependencies.length && `${ctrl.dependencies.length} deps`,
      ].filter(Boolean).join(' · ');
      childNodes.push({
        id: ctrlName, type: 'archNode',
        position: { x: 0, y: 0 },
        parentId: mod.name,
        extent: 'parent',
        data: { label: ctrlName, kind: 'controller', subline: sub || undefined },
        style: { width: nodeWidth('controller', ctrlName), height: nodeHeight('controller') },
      });
    }

    for (const provName of mod.providers) {
      if (seenChildren.has(provName)) continue;
      seenChildren.add(provName);
      const prov = map.providers.find((p) => p.name === provName);
      const deps = prov?.dependencies.length;
      childNodes.push({
        id: provName, type: 'archNode',
        position: { x: 0, y: 0 },
        parentId: mod.name,
        extent: 'parent',
        data: { label: provName, kind: 'provider', subline: deps ? `${deps} deps` : undefined },
        style: { width: nodeWidth('provider', provName), height: nodeHeight('provider') },
      });
    }

    // layout children vertically, unified width
    let childY  = HEADER_H + PADDING;
    let maxW    = 0;
    for (const c of childNodes) maxW = Math.max(maxW, c.style!.width as number);
    for (const c of childNodes) {
      c.position = { x: PADDING, y: childY };
      c.style    = { ...c.style, width: maxW };
      childY    += (c.style.height as number) + GAP;
    }

    const groupW = maxW + 2 * PADDING;
    const groupH = childNodes.length ? childY + PADDING : HEADER_H + 2 * PADDING;

    const sub = [
      mod.controllers.length && `${mod.controllers.length} ctrl`,
      mod.providers.length   && `${mod.providers.length} prov`,
    ].filter(Boolean).join(' · ');

    allNodes.push({
      id: mod.name, type: 'groupNode',
      position: { x: 0, y: 0 },
      data: { label: mod.name, kind: 'module', subline: sub || undefined },
      style: { width: groupW, height: groupH },
    });

    allNodes.push(...childNodes);
  }

  // orphan controllers / providers not in any module
  for (const comp of [...map.controllers, ...map.providers]) {
    if (seenChildren.has(comp.name)) continue;
    const kind = comp.type ?? (map.controllers.find((c) => c.name === comp.name) ? 'controller' : 'provider');
    allNodes.push({
      id: comp.name, type: 'archNode',
      position: { x: 0, y: 0 },
      data: { label: comp.name, kind },
      style: { width: nodeWidth(kind, comp.name), height: nodeHeight(kind) },
    });
  }

  // inject edges only (no contains edges — grouping is visual)
  const edges: Edge[] = [];
  for (const comp of [...map.controllers, ...map.providers]) {
    for (const dep of comp.dependencies) {
      edges.push({
        id: `i-${comp.name}-${dep}`, source: comp.name, target: dep,
        type: 'smoothstep', animated: true, markerEnd: injectsMarker,
        style: { stroke: '#f97316', strokeWidth: 1.5 },
      });
    }
  }

  return { nodes: applyGroupedLayout(allNodes, edges), edges };
}

function applyGroupedLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 });

  // map childId → parentId
  const childToParent = new Map<string, string>();
  for (const n of nodes) if (n.parentId) childToParent.set(n.id, n.parentId);

  // add only top-level nodes (no parentId) to dagre
  for (const n of nodes) {
    if (!n.parentId)
      g.setNode(n.id, { width: n.style!.width as number, height: n.style!.height as number });
  }

  // add edges between top-level nodes (resolve child → parent)
  for (const e of edges) {
    const src = childToParent.get(e.source) ?? e.source;
    const tgt = childToParent.get(e.target) ?? e.target;
    if (src !== tgt && g.hasNode(src) && g.hasNode(tgt)) g.setEdge(src, tgt);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    if (n.parentId) return n; // already positioned relative to parent
    const { x, y } = g.node(n.id);
    const w = n.style!.width  as number;
    const h = n.style!.height as number;
    return { ...n, position: { x: x - w / 2, y: y - h / 2 } };
  });
}
