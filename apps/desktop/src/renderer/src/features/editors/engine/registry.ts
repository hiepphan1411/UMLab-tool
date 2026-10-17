// Registry của engine (docs/spec/engine.md mục 1–4, 10): mỗi loại sơ đồ chỉ khai báo shape, connector, palette, luật kiểm tra.
import type { ComponentType, ReactNode } from 'react';
import type { ZodTypeAny } from 'zod';
import type * as Y from 'yjs';
import type { Connector, DiagramMeta, ModelElement, Routing, Style, View } from '@umlab/core';
import type { Box, Pt } from './geometry';
import type { RouteEnv, Routed } from './route';
import type { Engine } from './engine';

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
  /** Thông tin project (Diagram Info); không có khi dựng ảnh thu nhỏ ngoài editor. */
  project?(): ProjectInfoLite | null;
}

export interface ProjectInfoLite {
  name: string;
  ownerName: string;
  /** userId → tên hiển thị (thành viên project). */
  members: Record<string, string>;
}

/** Giao dịch ghi (một bước undo). Mọi giá trị là JSON thuần, thay cả object. */
export interface Tx {
  readonly lookup: EngineLookup;
  view(id: string): View | undefined;
  conn(id: string): Connector | undefined;
  model(id: string): ModelElement | undefined;
  /** Mọi hình / đường nối của sơ đồ ở trạng thái mới nhất trong giao dịch (lookup.views() là bản trước giao dịch). */
  allViews(): View[];
  allConns(): Connector[];
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
  /** Gợi ý khi gõ (vd. kiểu sau dấu `:`): nhận phần dòng trước con trỏ, trả về vị trí bắt đầu từ cần thay + danh sách. */
  suggest?: (lineBeforeCaret: string) => { from: number; items: string[] } | null;
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
  /** Mở một tab bên trái của editor (vd. 'icons'). */
  requestTab?: (id: string) => void;
}

/** Tay nắm riêng của hình (đuôi Callout, đỉnh Polygon…), vẽ khi hình được chọn một mình. */
export interface ShapeHandle {
  key: string;
  x: number;
  y: number;
  shape?: 'circle' | 'diamond' | 'square';
  title?: string;
}

/** Một điểm của công cụ Pen: toạ độ + tay cầm bezier (đối xứng). */
export interface PenPoint {
  x: number;
  y: number;
  /** Tay cầm phía sau (điểm điều khiển ra); tay cầm phía trước đối xứng qua điểm. */
  cx?: number;
  cy?: number;
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
  /** Chỉ kéo được theo trục x (lifeline Sequence). */
  moveAxis?: 'x';
  /** Menu chuột phải riêng. */
  contextMenu?: (
    view: View,
    api: { apply: (fn: (tx: Tx) => void) => void; lookup: EngineLookup; open: (diagramId: string) => void },
  ) => {
    label: string;
    onSelect: () => void;
  }[];
  /** Vẽ lại khi danh sách/thông tin sơ đồ trong project đổi (Diagram Overview, Diagram Info). */
  live?: boolean;
  /** Tay nắm riêng (khi hình được chọn một mình). */
  handles?: (ctx: RenderCtx<P>) => ShapeHandle[];
  /** Kéo tay nắm riêng → props mới (xem trước khi kéo, ghi khi thả). null = không đổi. */
  dragHandle?: (ctx: RenderCtx<P>, key: string, pt: Pt, mods: { shift: boolean }) => Record<string, unknown> | null;
  /** Công cụ Pen: bấm từng điểm (kéo để tạo tay cầm), Enter / nhấp đúp kết thúc, bấm điểm đầu để khép kín. */
  pen?: (
    pts: PenPoint[],
    closed: boolean,
  ) => { x: number; y: number; w: number; h: number; props: Record<string, unknown> } | null;
  /** Công cụ vẽ tay (Pencil, Calligraphy): kéo chuột ghi điểm rồi tạo hình từ nét. */
  ink?: (pts: Pt[]) => { x: number; y: number; w: number; h: number; props: Record<string, unknown> } | null;
  /** Phím tắt khi hình đang được chọn, vd. 'Alt+Shift+A' thêm thuộc tính. Trả về khoá vùng chữ cần mở sửa (nếu có). */
  shortcuts?: Record<string, (tx: Tx, view: View) => string | void>;
  /** Nhấp đúp mở thứ khác (Diagram Overview, Interaction Use, Call Behavior, chọn ảnh). */
  onDoubleClick?: (
    view: View,
    api: { open: (diagramId: string) => void; lookup: EngineLookup; apply: (fn: (tx: Tx) => void) => void },
  ) => boolean;
  /** Gọi ngay sau khi người dùng đặt hình bằng công cụ / kéo thả (mở chọn ảnh, chụp màn hình…). */
  onPlaced?: (
    view: View,
    api: { apply: (fn: (tx: Tx) => void) => void; lookup: EngineLookup; remove: () => void },
  ) => void;
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
  /** Vẽ trong khung Note gấp mép (vd. điều kiện của Extend). */
  note?: boolean;
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
  /** Màu/độ dày mặc định khi tạo. */
  defaultStyle?: Style;
  inspector?: ComponentType<{
    conn: Connector;
    model: ModelElement | null;
    apply: (fn: (tx: Tx) => void) => void;
    lookup: EngineLookup;
    readOnly: boolean;
  }>;
  onCreate?: (tx: Tx, c: Connector, src: ViewCtx, tgt: ViewCtx) => void;
  onDelete?: (tx: Tx, c: Connector) => void;
  /** Sau khi người dùng tạo đường nối (ngoài giao dịch) — hỏi thêm (vd. tạo bảng trung gian cho N-N). */
  afterCreate?: (e: Engine, c: Connector) => void;
  /** Sau khi xoá đường nối (ngoài giao dịch); `model` là phần tử mô hình trước khi xoá. */
  afterDelete?: (e: Engine, c: Connector, model: ModelElement | null) => void;
  /** Đầu mút có thể là điểm tự do (Line, found/lost message). */
  freeEnds?: boolean;
  /** Nhãn phụ thuộc phần tử khác (Extend lấy tên extension point của use case gốc) → vẽ lại khi mô hình đổi. */
  live?: boolean;
  /** Đường đi do bố cục riêng của loại sơ đồ tính (message Sequence) — không có waypoint / tay nắm đoạn. */
  route?: (c: Connector, env: RouteEnv) => Routed | null;
  /** Đầu mút lưu toạ độ y (thời gian) thay cho cạnh: khi vẽ / nối lại ghi `y` của điểm bấm. */
  timeline?: boolean;
  /** Kéo thân đường nối (message: kéo lên/xuống đổi thứ tự; Shift + kéo chèn khoảng trống). */
  bodyDrag?: {
    preview: (c: Connector, dy: number, lookup: EngineLookup) => Map<string, Partial<Connector>>;
    commit: (tx: Tx, c: Connector, dy: number, mods: { shift: boolean }) => void;
  };
  /** Nhấp đúp lên đường nối (thay cho bẻ khúc). */
  onDoubleClick?: (c: Connector, e: Engine) => void;
}

export interface PaletteItem {
  /** shape type, connector kind, hoặc công cụ ('tool:select' | 'tool:hand' | 'tool:lasso'). */
  id: string;
  label?: string;
  icon?: string;
  /** Biến thể trong flyout ◢. */
  variants?: PaletteItem[];
  /** Mục là một lệnh (Element Group: nhóm vùng chọn) thay vì công cụ. */
  action?: (e: Engine) => void;
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

/** Ngữ cảnh khi thả/dán dữ liệu ngoài vào canvas. */
export interface CanvasInputCtx {
  engine: Engine;
  /** Toạ độ thế giới (vị trí thả hoặc tâm khung nhìn khi dán). */
  at: Pt;
  shift: boolean;
  /** Hình dưới con trỏ (khi thả). */
  target: View | null;
  /** Mở sửa chữ hình vừa tạo. */
  editText: (viewId: string) => void;
}

/** Thả từ ngoài (icon từ tab Icon, tệp ảnh…). Trả về true nếu đã xử lý. */
export interface DropHandler {
  /** Kiểu dữ liệu nhận (dataTransfer.types) — 'Files' cho tệp. */
  types: string[];
  diagramTypes?: string[];
  drop: (dt: DataTransfer, ctx: CanvasInputCtx) => boolean | Promise<boolean>;
}

/** Dán từ clipboard hệ thống (ảnh chụp màn hình…) trước khi dán hình nội bộ. */
export interface PasteHandler {
  diagramTypes?: string[];
  paste: (items: ClipboardItems, ctx: CanvasInputCtx) => Promise<boolean>;
}

// ---------------- registry ----------------
const shapes = new Map<string, ShapeDef>();
const dropHandlers: DropHandler[] = [];
const pasteHandlers: PasteHandler[] = [];
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
export function registerDropHandler(h: DropHandler): void {
  dropHandlers.push(h);
}
export function registerPasteHandler(h: PasteHandler): void {
  pasteHandlers.push(h);
}
export const getDropHandlers = (diagramType: string) =>
  dropHandlers.filter((h) => !h.diagramTypes || h.diagramTypes.includes(diagramType));
export const getPasteHandlers = (diagramType: string) =>
  pasteHandlers.filter((h) => !h.diagramTypes || h.diagramTypes.includes(diagramType));
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

// ---------- chuẩn hoá bố cục theo loại sơ đồ ----------
/** Gọi cuối mỗi giao dịch của engine (cùng giao dịch → cùng một bước Undo), vd. Sequence: căn lifeline, hạ hộp đầu
 * khi Create, kéo dài lifeline theo message. */
export type Normalizer = (tx: Tx) => void;
const normalizers = new Map<string, Normalizer>();
export function registerNormalizer(diagramType: string, fn: Normalizer): void {
  normalizers.set(diagramType, fn);
}
export function getNormalizer(diagramType: string): Normalizer | undefined {
  return normalizers.get(diagramType);
}
