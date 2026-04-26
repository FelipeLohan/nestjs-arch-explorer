import { MarkerType, type Edge } from '@xyflow/react';
import type { ArchitectureMap } from '../types';

const injectsMarker  = { type: MarkerType.ArrowClosed, color: '#f97316', width: 10, height: 10 };
const containsMarker = { type: MarkerType.ArrowClosed, color: '#3f3f46', width: 10, height: 10 };

export function buildEdges(
  map: ArchitectureMap,
  seen: Set<string>,
): { edges: Edge[]; injectSources: Map<string, Set<string>> } {
  const edges: Edge[] = [];
  const injectSources = new Map<string, Set<string>>();

  for (const comp of [...map.controllers, ...map.providers]) {
    for (const dep of comp.dependencies) {
      if (!seen.has(dep)) continue;
      edges.push({
        id: `i-${comp.name}-${dep}`, source: comp.name, target: dep,
        type: 'smoothstep', animated: true, markerEnd: injectsMarker,
        style: { stroke: '#f97316', strokeWidth: 1.5 },
      });
      if (!injectSources.has(dep)) injectSources.set(dep, new Set());
      injectSources.get(dep)!.add(comp.name);
    }
  }

  for (const mod of map.modules) {
    const members = new Set([...mod.controllers, ...mod.providers]);

    for (const c of mod.controllers)
      edges.push({
        id: `c-${mod.name}-${c}`, source: mod.name, target: c,
        type: 'smoothstep', markerEnd: containsMarker,
        style: { stroke: '#3f3f46', strokeWidth: 1 },
      });

    for (const p of mod.providers) {
      const sources = injectSources.get(p);
      const isMediated = sources ? [...sources].some((s) => members.has(s)) : false;
      if (!isMediated)
        edges.push({
          id: `c-${mod.name}-${p}`, source: mod.name, target: p,
          type: 'smoothstep', markerEnd: containsMarker,
          style: { stroke: '#3f3f46', strokeWidth: 1 },
        });
    }
  }

  return { edges, injectSources };
}
