import type { Node } from '@xyflow/react';
import type { ArchitectureMap } from '../types';
import { nodeWidth, nodeHeight } from './constants';

export function buildNodes(map: ArchitectureMap): { nodes: Node[]; seen: Set<string> } {
  const nodes: Node[] = [];
  const seen = new Set<string>();

  const add = (id: string, kind: string, subline?: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const w = nodeWidth(kind, id);
    const h = nodeHeight(kind);
    nodes.push({
      id, type: 'archNode',
      position: { x: 0, y: 0 },
      data: { label: id, kind, subline },
      style: { width: w, height: h },
    });
  };

  for (const mod of map.modules) {
    const sub = [
      mod.controllers.length && `${mod.controllers.length} ctrl`,
      mod.providers.length   && `${mod.providers.length} prov`,
    ].filter(Boolean).join(' · ');
    add(mod.name, 'module', sub || undefined);

    for (const c of mod.controllers) {
      const ctrl = map.controllers.find((x) => x.name === c);
      const parts = [
        ctrl?.routes?.length      && `${ctrl.routes.length} routes`,
        ctrl?.dependencies.length && `${ctrl.dependencies.length} deps`,
      ].filter(Boolean).join(' · ');
      add(c, 'controller', parts || undefined);
    }

    for (const p of mod.providers) {
      const prov = map.providers.find((x) => x.name === p);
      const deps = prov?.dependencies.length;
      add(p, 'provider', deps ? `${deps} deps` : undefined);
    }
  }

  for (const c of map.controllers) {
    const parts = [
      c.routes?.length      && `${c.routes.length} routes`,
      c.dependencies.length && `${c.dependencies.length} deps`,
    ].filter(Boolean).join(' · ');
    add(c.name, 'controller', parts || undefined);
  }

  for (const p of map.providers) {
    const deps = p.dependencies.length;
    add(p.name, 'provider', deps ? `${deps} deps` : undefined);
  }

  return { nodes, seen };
}
