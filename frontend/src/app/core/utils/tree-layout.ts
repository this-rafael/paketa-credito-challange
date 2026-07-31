import {
  LayoutEdge,
  LayoutNode,
  MenuItem,
  TreeLayout,
} from '../models/menu';

const NODE_WIDTH = 168;
const NODE_HEIGHT = 56;
const H_GAP = 36;
const V_GAP = 72;

interface MeasuredNode {
  item: MenuItem;
  level: number;
  width: number;
  children: MeasuredNode[];
}

function measure(item: MenuItem, level: number): MeasuredNode {
  const children = (item.submenus ?? []).map((child) => measure(child, level + 1));
  const childrenWidth =
    children.length === 0
      ? NODE_WIDTH
      : children.reduce((sum, c) => sum + c.width, 0) + H_GAP * (children.length - 1);
  return {
    item,
    level,
    width: Math.max(NODE_WIDTH, childrenWidth),
    children,
  };
}

function place(
  node: MeasuredNode,
  left: number,
  top: number,
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  parentId: string | null,
): void {
  const x = left + node.width / 2 - NODE_WIDTH / 2;
  const y = top;
  nodes.push({
    id: node.item.id,
    name: node.item.name,
    x,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    level: node.level,
    childCount: node.children.length,
  });

  if (parentId) {
    const parent = nodes.find((n) => n.id === parentId);
    if (parent) {
      edges.push({
        id: `${parentId}->${node.item.id}`,
        parentId,
        childId: node.item.id,
        x1: parent.x + parent.width / 2,
        y1: parent.y + parent.height,
        x2: x + NODE_WIDTH / 2,
        y2: y,
      });
    }
  }

  let childLeft = left;
  for (const child of node.children) {
    place(child, childLeft, top + NODE_HEIGHT + V_GAP, nodes, edges, node.item.id);
    childLeft += child.width + H_GAP;
  }
}

export function buildTreeLayout(roots: MenuItem[]): TreeLayout {
  if (roots.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const measured = roots.map((root) => measure(root, 0));
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  let left = 24;
  const top = 24;

  for (const root of measured) {
    place(root, left, top, nodes, edges, null);
    left += root.width + H_GAP * 2;
  }

  const width =
    nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0) + 48;
  const height =
    nodes.reduce((max, n) => Math.max(max, n.y + n.height), 0) + 48;

  return { nodes, edges, width, height };
}
