import type { Node, Edge } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { nodeWidth, nodeHeight } from './constants';

export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 110, marginx: 40, marginy: 40 });

  for (const n of nodes)
    g.setNode(n.id, {
      width:  nodeWidth(n.data.kind as string, n.id),
      height: nodeHeight(n.data.kind as string),
    });

  for (const e of edges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const w = nodeWidth(n.data.kind as string, n.id);
    const h = nodeHeight(n.data.kind as string);
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });
}
