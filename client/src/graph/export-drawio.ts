import type { Node, Edge } from '@xyflow/react';

const KIND_FILL: Record<string, string> = {
  module:     '#0d0c1d',
  controller: '#051f14',
  provider:   '#1c1400',
};

const KIND_STROKE: Record<string, string> = {
  module:     '#6366f1',
  controller: '#10b981',
  provider:   '#f59e0b',
};

function xmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseDim(v: unknown): number {
  if (typeof v === 'number') return Math.round(v);
  if (typeof v === 'string') return Math.round(parseFloat(v));
  return 0;
}

function nodeStyle(kind: string): string {
  const isModule = kind === 'module';
  return (
    (isModule ? 'rounded=1;arcSize=15;' : 'rounded=0;') +
    'whiteSpace=wrap;html=1;' +
    `fillColor=${KIND_FILL[kind] ?? '#1a1a1a'};` +
    `strokeColor=${KIND_STROKE[kind] ?? '#52525b'};` +
    'fontColor=#fafafa;' +
    `fontSize=${isModule ? 12 : 11};` +
    (isModule ? 'fontStyle=1;' : '') +
    'verticalAlign=middle;'
  );
}

export function buildDrawioXml(nodes: Node[], edges: Edge[]): string {
  const cells: string[] = [];

  for (const node of nodes) {
    const kind  = node.data?.kind as string;
    const label = node.id;
    const sub   = node.data?.subline as string | undefined;
    const x = Math.round(node.position.x);
    const y = Math.round(node.position.y);
    const w = parseDim(node.style?.width)  || 160;
    const h = parseDim(node.style?.height) || 44;

    const html = sub
      ? `<b>${xmlAttr(label)}</b><br><font style="font-size:9px;color:#a1a1aa;">${xmlAttr(sub)}</font>`
      : `<b>${xmlAttr(label)}</b>`;

    cells.push(
      `<mxCell id="${xmlAttr(node.id)}" value="${xmlAttr(html)}" ` +
      `style="${nodeStyle(kind)}" vertex="1" parent="1">` +
      `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>` +
      `</mxCell>`,
    );
  }

  edges.forEach((edge, i) => {
    const inject = !!edge.animated;
    const style =
      'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;' +
      (inject
        ? 'strokeColor=#f97316;dashed=1;endArrow=open;endFill=0;'
        : 'strokeColor=#52525b;endArrow=open;endFill=0;');

    cells.push(
      `<mxCell id="e${i}" value="" style="${style}" ` +
      `edge="1" source="${xmlAttr(edge.source)}" target="${xmlAttr(edge.target)}" parent="1">` +
      `<mxGeometry relative="1" as="geometry"/>` +
      `</mxCell>`,
    );
  });

  return (
    `<mxfile host="nestjs-arch-explorer">` +
    `<diagram name="Architecture">` +
    `<mxGraphModel grid="0" tooltips="1" connect="0" arrows="1" fold="0" page="0" math="0" shadow="0">` +
    `<root><mxCell id="0"/><mxCell id="1" parent="0"/>` +
    cells.join('') +
    `</root></mxGraphModel></diagram></mxfile>`
  );
}
