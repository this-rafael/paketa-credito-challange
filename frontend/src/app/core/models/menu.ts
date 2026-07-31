export interface MenuItem {
  id: string;
  name: string;
  submenus?: MenuItem[];
}

export interface CreateMenuItemRequest {
  name: string;
  relatedId?: number;
}

export interface CreateMenuItemResponse {
  id: string;
}

export interface MenuStats {
  total: number;
  roots: number;
  maxDepth: number;
  submenuCount: number;
}

export interface FlatMenuItem {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  childCount: number;
  path: string[];
}

export type ViewMode = 'tree' | 'map';

export interface LayoutNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  childCount: number;
}

export interface LayoutEdge {
  id: string;
  parentId: string;
  childId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TreeLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}
