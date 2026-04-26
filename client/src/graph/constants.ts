export const KIND_COLOR: Record<string, string> = {
  module:     '#6366f1',
  controller: '#10b981',
  provider:   '#f59e0b',
};

export const KIND_ICON: Record<string, string> = {
  module:     '⬡',
  controller: '⇢',
  provider:   '◈',
};

const MIN_W: Record<string, number> = { module: 170, controller: 160, provider: 155 };
const NODE_H: Record<string, number> = { module: 58, controller: 52, provider: 44 };

export function nodeWidth(kind: string, label: string): number {
  return Math.max(MIN_W[kind] ?? 155, label.length * 7 + 52);
}

export function nodeHeight(kind: string): number {
  return NODE_H[kind] ?? 44;
}
