// Kiểu dữ liệu định dạng `umlab` — xem docs/spec/json-format.md.

export const DIAGRAM_TYPES = [
  'architecture',
  'gantt',
  'usecase',
  'usecase-spec',
  'class',
  'erd',
  'activity',
  'sequence',
] as const;
export type DiagramType = (typeof DIAGRAM_TYPES)[number];

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Routing = 'orthogonal' | 'straight' | 'curved' | 'manual' | 'smart';

export interface Point {
  x: number;
  y: number;
}

export interface Style {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  dash?: boolean;
  radius?: number;
  [k: string]: unknown;
}

/** Một hình trên canvas. */
export interface View {
  id: string;
  shape: string;
  modelId: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  parentId: string | null;
  props: Record<string, unknown>;
  style: Style;
  locked?: boolean;
  hidden?: boolean;
  /** Element Group (Ctrl+G): các view cùng groupId được chọn/kéo cùng nhau. */
  groupId?: string | null;
}

/** Đầu mút đường nối. viewId null với found/lost message, đường tự do. */
export interface Endpoint {
  viewId: string | null;
  side?: Side;
  t?: number;
  /** Sequence: toạ độ theo thời gian trên lifeline; đường tự do: toạ độ tuyệt đối. */
  y?: number;
  x?: number;
}

export interface Label {
  role: string;
  text: string;
  pos: number;
  dx?: number;
  dy?: number;
}

export interface Connector {
  id: string;
  kind: string;
  modelId: string | null;
  source: Endpoint;
  target: Endpoint;
  routing: Routing;
  waypoints: Point[];
  labels: Label[];
  props: Record<string, unknown>;
  style: Style;
  z?: number;
}

export interface ModelElement {
  id: string;
  kind: string;
  name: string;
  data: Record<string, unknown>;
}

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
}

export interface CanvasSettings {
  background: string;
  grid: boolean;
  notation?: string;
  [k: string]: unknown;
}

export interface GeneratedFrom {
  sourceDiagramId: string;
  sourceVersion: number;
  generator: string;
}

export interface DiagramMeta {
  id: string;
  type: DiagramType;
  name: string;
  folderId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  generatedFrom?: GeneratedFrom | null;
  canvas: CanvasSettings;
}

export interface DiagramContent {
  views: View[];
  connectors: Connector[];
  data: unknown;
}

export type DiagramRecord = DiagramMeta & DiagramContent;

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

/** Toàn bộ dữ liệu một project ở dạng JSON thuần (dùng cho nhập/xuất/nhân bản/mẫu). */
export interface ProjectBundle {
  project: ProjectInfo;
  folders: Folder[];
  diagrams: DiagramRecord[];
  model: ModelElement[];
  meta?: Record<string, unknown>;
}

export interface DiagramFile {
  format: 'umlab';
  schemaVersion: number;
  kind: 'diagram';
  exportedAt: string;
  diagram: {
    id: string;
    type: DiagramType;
    name: string;
    canvas: CanvasSettings;
    views: View[];
    connectors: Connector[];
    data: unknown;
    generatedFrom?: GeneratedFrom | null;
  };
  model: ModelElement[];
}

export interface ProjectFile {
  format: 'umlab';
  schemaVersion: number;
  kind: 'project';
  exportedAt: string;
  project: ProjectInfo;
  folders: Folder[];
  diagrams: {
    id: string;
    folderId: string | null;
    type: DiagramType;
    name: string;
    order?: number;
    canvas?: CanvasSettings;
    views: View[];
    connectors: Connector[];
    data: unknown;
    generatedFrom?: GeneratedFrom | null;
  }[];
  model: ModelElement[];
  meta?: Record<string, unknown>;
}
