import type { NodeProps } from '@xyflow/react';
import { KIND_COLOR } from './constants';
import './GroupNode.css';

export function GroupNode({ id, data }: NodeProps) {
  const color = KIND_COLOR.module;
  const sub = data?.subline as string | undefined;

  return (
    <div className="group-node" style={{ '--node-color': color } as React.CSSProperties}>
      <div className="group-node__header">
        <span className="group-node__icon">⬡</span>
        <div className="group-node__title">
          <span className="group-node__label">{id}</span>
          {sub && <span className="group-node__sub">{sub}</span>}
        </div>
      </div>
    </div>
  );
}
