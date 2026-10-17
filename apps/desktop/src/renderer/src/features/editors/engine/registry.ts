// Registry của engine (docs/spec/engine.md mục 1–4, 10): mỗi loại sơ đồ chỉ khai báo shape, connector, palette, luật kiểm tra.
import type { ComponentType, ReactNode } from 'react';
import type { ZodTypeAny } from 'zod';
import type * as Y from 'yjs';
import type { Connector, DiagramMeta, ModelElement, Routing, Style, View } from '@umlab/core';
import type { Box, Pt } from './geometry';

export interface EngineLookup {
  doc: Y.Doc;
  diagramId: string;
  view(id: string | null | undefined): View | undefined;
  conn(id: string | null | undefined): Connector | undefined;
  model(id: string | null | undefined): ModelElement | undefined;
  views(): View[];
  conns(): Connector[];
  children(parentId: string): View[];
  diagram(id: string): DiagramMeta | undefined;
  diagrams(): DiagramMeta[];
  allModel(): ModelElement[];
}

/** Giao dịch ghi (một bước undo). Mọi giá trị là JSON thuần, thay cả object. */
export interface Tx {
  readonly lookup: EngineLookup;
  view(id: string): View | undefined;
  conn(id: string): Connector | undefined;
  model(id: string): ModelElement | undefined;
  addView(v: View): void;
  setView(id: string, patch: Partial<View> | ((v: View) => View)): void;
  setViewProps(id: string, patch: Record<string, unknown>): void;
  deleteView(id: string): void;
  addConn(c: Connector): void;
  setConn(id: string, patch: Partial<Connector> | ((c: Connector) => Connector)): void;
  setConnProps(id: string, patch: Record<string, unknown>): void;
  deleteConn(id: string): void;
  addModel(m: ModelElement): void;
  setModel(id: string, patch: Partial<ModelElement> | ((m: ModelElement) => ModelElement)): void;
  setModelData(id: string, patch: Record<string, unknown>): void;
  deleteModel(id: string): void;
  /** Ghi một khoá của `data:<diagramId>` (sơ đồ không phải canvas). */
  setData(key: string, value: unknown): void;
  meta(key: string): unknown;
  setMeta(key: string, value: unknown): void;
}

export interface RenderCtx<P = Record<string, unknown>> {
  view: View;
  props: P;
  style: Required<Pick<Style, 'fill' | 'stroke' | 'strokeWidth'>> & Style;
  model: ModelElement | null;
  /** model.data (hoặc {} nếu không có model). */
  data: Record<string, unknown>;
  lookup: EngineLookup;
  zoom: number;
  forExport: boolean;
  /** Khoá vùng chữ đang sửa tại chỗ (ẩn chữ đó khi vẽ). */
  editing: string | null;
}

export interface TextRegion {
  key: string;
  box: Box;
  value: string;
  multiline?: boolean;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  fontWeight?: number;
  placeholder?: string;
  /** Vùng danh sách (compartment): mỗi dòng một mục; Enter thêm dòng, Backspace dòng rỗng xoá dòng, Tab chuyển ngăn. */
  list?: boolean;
  commit: (tx: Tx, value: string) => void;
}

export interface CatalogItem {
  connector: string;
  /** Hình mới tạo ở đầu kia khi thả ra chỗ trống. */
  shape?: string;
  label: string;
  /** Đường nối đi ngược (hình mới là nguồn). */
  reverse?: boolean;
}

export interface ShapeInspectorProps {
  view: View;
  model: ModelElement | null;
  apply: (fn: (tx: Tx) => void) => void;
  lookup: EngineLookup;
  readOnly: boolean;
}

export interface ShapeDef<P = Record<string, unknown>> {
  type: string;
  label: string;
  icon: string;
  modelKind?: string;
  defaultModel?: (lookup: EngineLookup) => { name: string; data: Record<string, unknown> };
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  resizable?: boolean | 'horizontal' | 'vertical';
  aspectLock?: boolean;
  container?: { accepts: string[] | '*'; autoGrow?: boolean; padding?: number; header?: number };
  defaultProps?: () => P;
  defaultStyle?: Style;
  /** zod schema của props → Inspector tự sinh (tab Hình dạng). */
  propsSchema?: ZodTypeAny;
  /** zod schema của model.data → Inspector tự sinh (tab Mô hình). */
  modelSchema?: ZodTypeAny;
  /** Hiện nhóm Nền & viền trong Inspector (mặc định true). */
  styleFields?: boolean | ('fill' | 'stroke' | 'strokeWidth' | 'dash' | 'radius' | 'fontSize')[];
  render: (ctx: RenderCtx<P>) => ReactNode;
  /** Dáng viền dùng cho hover/chọn và điểm nối. */
  outline?: 'rect' | 'ellipse' | 'diamond' | 'none';
  /** Không có chấm nối 4 cạnh (Note anchor vẫn nối được). */
  noPorts?: boolean;
  textRegions?: (ctx: RenderCtx<P>) => TextRegion[];
  /** Tự giãn theo nội dung (gọi sau mỗi lần sửa). */
  measure?: (ctx: RenderCtx<P>) => { w?: number; h?: number } | null;
  catalog?: CatalogItem[];
  inspector?: ComponentType<ShapeInspectorProps>;
  hitTest?: (view: View, x: number, y: number) => boolean;
  /** Tên hiển thị trong Lớp / tìm kiếm. */
  name?: (ctx: RenderCtx<P>) => string;
  /** Tạo phần tử mô hình hoặc khởi tạo thêm khi đặt hình. */
  onCreate?: (tx: Tx, view: View) => void;
  /** Bám viền hình khác (pin, parameter node, expansion node). */
  attach?: { to: string[] };
  /** Menu chuột phải riêng. */
  contextMenu?: (
    view: View,
    api: { apply: (fn: (tx: Tx) => void) => void; lookup: EngineLookup; open: (diagramId: string) => void },
  ) => {
    label: string;
    onSelect: () => void;
  }[];
  /** Công cụ vẽ tay (Pencil, Calligraphy): kéo chuột ghi điểm rồi tạo hình từ nét. */
  ink?: (pts: Pt[]) => { x: number; y: number; w: number; h: number; props: Record<string, unknown> } | null;
  /** Phím tắt khi hình đang được chọn, vd. 'Alt+Shift+A' thêm thuộc tính. Trả về khoá vùng chữ cần mở sửa (nếu có). */
  shortcuts?: Record<string, (tx: Tx, view: View) => string | void>;
  /** Nhấp đúp mở thứ khác (Diagram Overview, Interaction Use, Call Behavior). */
  onDoubleClick?: (view: View, api: { open: (diagramId: string) => void; lookup: EngineLookup }) => boolean;
}

export type MarkerKind =
  | 'none'
  | 'arrow-open'
  | 'arrow-filled'
  | 'triangle-hollow'
  | 'diamond-hollow'
  | 'diamond-filled'
  | 'circle-plus'
  | 'dot-filled'
  | 'cross-x'
  | 'half-arrow'
  | 'socket'
  | 'lollipop'
  | 'cf-one'
  | 'cf-many'
  | 'cf-zero-one'
  | 'cf-one-many'
  | 'cf-zero-many'
  | 'cf-one-only';

export interface ConnLook {
  line: 'solid' | 'dashed' | 'dotted';
  start: MarkerKind;
  end: MarkerKind;
  /** Ký hiệu giữa đường (tia sét Exception Handler / interrupting edge). */
  middle?: 'lightning' | null;
  stereotype?: string;
  stroke?: string;
  width?: number;
  /** Đường kép (tham gia toàn phần trong Chen). */
  double?: boolean;
}

export interface ComputedLabel {
  role: string;
  text: string;
  /** Vị trí theo độ dài đường (0..1) hoặc bám đầu mút. */
  pos?: number;
  end?: 'source' | 'target';
  italic?: boolean;
  /** Có thể kéo (lưu vào connector.labels[role]). */
  draggable?: boolean;
  bold?: boolean;
}

export interface ViewCtx {
  view: View;
  def: ShapeDef | undefined;
  model: ModelElement | null;
}

export interface ConnectorDef {
  kind: string;
  label: string;
  icon: string;
  modelKind?: string;
  defaultModel?: (src: ViewCtx, tgt: ViewCtx) => { name: string; data: Record<string, unknown> };
  look: ConnLook | ((c: Connector, model: ModelElement | null, lookup: EngineLookup) => ConnLook);
  defaultRouting: Exclude<Routing, 'manual'>;
  labels?: (c: Connector, model: ModelElement | null, lookup: EngineLookup) => ComputedLabel[];
  /** true = hợp lệ; chuỗi = lý do không hợp lệ (tooltip đỏ khi rê). */
  allow?: (src: ViewCtx, tgt: ViewCtx, lookup: EngineLookup) => true | string;
  /** Hợp lệ nhưng nên cảnh báo. */
  warn?: (src: ViewCtx, tgt: ViewCtx, lookup: EngineLookup) => string | null;
  selfLoop?: boolean;
  propsSchema?: ZodTypeAny;
  modelSchema?: ZodTypeAny;
  defaultProps?: () => Record<string, unknown>;
  inspector?: ComponentType<{
    conn: Connector;
    model: ModelElement | null;
    apply: (fn: (tx: Tx) => void) => void;
    lookup: EngineLookup;
    readOnly: boolean;
  }>;
  onCreate?: (tx: Tx, c: Connector, src: ViewCtx, tgt: ViewCtx) => void;
  onDelete?: (tx: Tx, c: Connector) => void;
  /** Đầu mút có thể là điểm tự do (Line, found/lost message). */
  freeEnds?: boolean;
}

export interface PaletteItem {
  /** shape type, connector kind, hoặc công cụ ('tool:select' | 'tool:hand' | 'tool:lasso'). */
  id: string;
  label?: string;
  icon?: string;
  /** Biến thể trong flyout ◢. */
  variants?: PaletteItem[];
  /** props/model ghi đè khi tạo (vd. Dependency «call»). */
  preset?: {
    props?: Record<string, unknown>;
    model?: Record<string, unknown>;
    style?: Style;
    size?: { w: number; h: number };
  };
}

export interface PaletteGroup {
  id: string;
  label?: string;
  items: PaletteItem[];
}

export interface Issue {
  level: 'error' | 'warning' | 'info';
  message: string;
  targetId?: string;
  fix?: { label: string; run: (tx: Tx) => void };
}

export interface RuleCtx {
  lookup: EngineLookup;
  views: View[];
  conns: Connector[];
  shape: (type: string) => ShapeDef | undefined;
}

export type Rule = (ctx: RuleCtx) => Issue[];

// ---------------- registry ----------------
const shapes = new Map<string, ShapeDef>();
const connectors = new Map<string, ConnectorDef>();
const palettes = new Map<string, PaletteGroup[]>();
const rules = new Map<string, Rule[]>();

export function registerShape<P>(def: ShapeDef<P>): void {
  shapes.set(def.type, def as unknown as ShapeDef);
}
export function registerConnector(def: ConnectorDef): void {
  connectors.set(def.kind, def);
}
export function registerPalette(diagramType: string, groups: PaletteGroup[]): void {
  palettes.set(diagramType, groups);
}
export function registerRules(diagramType: string, list: Rule[]): void {
  rules.set(diagramType, [...(rules.get(diagramType) ?? []), ...list]);
}

/** Mục palette có thể là biến thể "kind#preset" — phần trước dấu # là shape/connector thật. */
export const baseTool = (id: string) => id.split('#')[0];
export const getShape = (type: string) => shapes.get(baseTool(type));
export const getConnector = (kind: string) => connectors.get(baseTool(kind));
export const getPalette = (diagramType: string) => palettes.get(diagramType) ?? [];
export const getRules = (diagramType: string) => rules.get(diagramType) ?? [];
export const allShapes = () => [...shapes.values()];
export const allConnectors = () => [...connectors.values()];

export function connLook(
  def: ConnectorDef | undefined,
  c: Connector,
  model: ModelElement | null,
  lookup: EngineLookup,
): ConnLook {
  if (!def) return { line: 'solid', start: 'none', end: 'arrow-open' };
  return typeof def.look === 'function' ? def.look(c, model, lookup) : def.look;
}

/** Hình có nhận con loại `childType` không. */
export function accepts(parent: ShapeDef | undefined, childType: string): boolean {
  if (!parent?.container) return false;
  const a = parent.container.accepts;
  return a === '*' || a.includes(childType);
}

export type { Pt };
