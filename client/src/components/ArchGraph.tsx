import { useCallback, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState, BackgroundVariant,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ArchitectureMap, SelectedNode } from '../types';
import { ArchNode } from '../graph/ArchNode';
import { buildNodes } from '../graph/node-builder';
import { buildEdges } from '../graph/edge-builder';
import { applyDagreLayout } from '../graph/layout';
import { KIND_COLOR } from '../graph/constants';

const nodeTypes = { archNode: ArchNode };

function buildElements(map: ArchitectureMap) {
  const { nodes: raw, seen } = buildNodes(map);
  const { edges } = buildEdges(map, seen);
  return { nodes: applyDagreLayout(raw, edges), edges };
}

interface Props {
  map: ArchitectureMap;
  onSelect: (node: SelectedNode | null) => void;
}

export function ArchGraph({ map, onSelect }: Props) {
  const { nodes: ln, edges: le } = useMemo(() => buildElements(map), [map]);
  const [nodes, , onNodesChange] = useNodesState(ln);
  const [edges, , onEdgesChange] = useEdgesState(le);

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

  return (
    <div style={{ flex: 1, height: '100%' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => onSelect(null)}
        nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.15 }}
        minZoom={0.08} maxZoom={2.5}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls showInteractive={false}
          style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8 }} />
        <MiniMap
          nodeColor={(n) => KIND_COLOR[n.data?.kind as string] ?? '#52525b'}
          nodeStrokeWidth={0} nodeBorderRadius={4} maskColor="rgba(9,9,11,0.75)"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8 }} />
        <Panel position="top-right" style={{
          display: 'flex', flexDirection: 'column', gap: 5,
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 8, padding: '8px 12px', fontSize: 10, color: 'var(--muted)',
        }}>
          {Object.entries(KIND_COLOR).map(([kind, color]) => (
            <span key={kind} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: color, opacity: .9, flexShrink: 0 }} />
              {kind}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, paddingTop: 6, borderTop: '1px solid var(--surface2)' }}>
            <span style={{ width: 18, borderTop: '2px solid #f97316', flexShrink: 0 }} />
            injects
          </span>
        </Panel>
      </ReactFlow>
    </div>
  );
}
