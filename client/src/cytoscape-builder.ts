import type { ElementDefinition } from 'cytoscape';
import type { ArchitectureMap } from './types';

export function buildElements(map: ArchitectureMap): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const nodeIds = new Set<string>();

  const addNode = (id: string, label: string, kind: string) => {
    if (nodeIds.has(id)) return;
    nodeIds.add(id);
    elements.push({ data: { id, label, kind } });
  };

  for (const mod of map.modules) {
    addNode(mod.name, mod.name, 'module');
    for (const c of mod.controllers) addNode(c, c, 'controller');
    for (const p of mod.providers) addNode(p, p, 'provider');
  }

  for (const ctrl of map.controllers) {
    addNode(ctrl.name, ctrl.name, 'controller');
  }
  for (const prov of map.providers) {
    addNode(prov.name, prov.name, 'provider');
  }

  // Module → member (contains)
  for (const mod of map.modules) {
    for (const c of mod.controllers) {
      elements.push({ data: { source: mod.name, target: c, kind: 'contains' } });
    }
    for (const p of mod.providers) {
      elements.push({ data: { source: mod.name, target: p, kind: 'contains' } });
    }
  }

  // Component → dependency (injects)
  for (const ctrl of map.controllers) {
    for (const dep of ctrl.dependencies) {
      if (nodeIds.has(dep)) {
        elements.push({ data: { source: ctrl.name, target: dep, kind: 'injects' } });
      }
    }
  }
  for (const prov of map.providers) {
    for (const dep of prov.dependencies) {
      if (nodeIds.has(dep)) {
        elements.push({ data: { source: prov.name, target: dep, kind: 'injects' } });
      }
    }
  }

  return elements;
}
