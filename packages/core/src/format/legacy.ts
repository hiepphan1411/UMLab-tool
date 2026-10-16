// Chuyển file của UniPark+ Diagram Studio cũ ("format": "unipark-diagram", version 1|2) sang ProjectBundle.
// Xem docs/spec/json-format.md mục 4.
import { normGantt } from '../gantt/model';
import { uid } from '../util/ids';
import { isPlainObject } from '../util/json';
import type { Connector, DiagramRecord, ProjectBundle, Routing, Side, View } from './types';

/** Giá trị mặc định của tool cũ (DEFAULTS, EDGE_DEFAULTS) — để chuẩn hoá phần tử thiếu thuộc tính. */
export const LEGACY_DEFAULTS = {
  group: {
    title: 'NHÓM',
    titleSize: 14,
    titleWeight: 500,
    titleColor: '#1F2937',
    titleAlign: 'left',
    fill: '#ECEAE6',
    stroke: '#B5B0A8',
    strokeWidth: 1.25,
    dash: true,
    radius: 12,
  },
  node: {
    title: 'Thành phần',
    subtitle: '',
    icons: [] as { k: string; c?: string; sw?: number }[],
    layout: 'left',
    iconSize: 30,
    textAlign: 'center',
    titleSize: 15,
    titleWeight: 500,
    subSize: 13,
    textColor: '#1F2937',
    subColor: '#374151',
    fill: '#FFFFFF',
    stroke: '#4A6FA5',
    strokeWidth: 1.5,
    dash: false,
    radius: 8,
    shadow: true,
  },
  text: { text: 'Văn bản', fontSize: 14, weight: 400, color: '#1F2937', align: 'left' },
  shape: {
    shape: 'rect',
    text: '',
    fontSize: 14,
    color: '#1F2937',
    fill: '#FFFFFF',
    stroke: '#64748B',
    strokeWidth: 1.5,
    dash: false,
    radius: 8,
    shadow: false,
  },
  icon: { icon: 'lucide:box', color: '#334155' },
} as const;

export const LEGACY_EDGE_DEFAULTS = {
  color: '#B5602E',
  width: 1.6,
  dash: false,
  arrowStart: false,
  arrowEnd: true,
  routing: 'ortho',
  points: null,
  label: '',
  labelPos: 0.5,
  radius: 8,
};

export function isLegacyUnipark(v: unknown): boolean {
  return isPlainObject(v) && v.format === 'unipark-diagram';
}

type Raw = Record<string, unknown>;
const STYLE_KEYS = ['fill', 'stroke', 'strokeWidth', 'dash', 'radius'] as const;
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];

function splitStyle(o: Raw) {
  const style: Record<string, unknown> = {};
  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (['id', 'type', 'x', 'y', 'w', 'h', 'locked', 'hidden'].includes(k)) continue;
    if ((STYLE_KEYS as readonly string[]).includes(k)) style[k] = v;
    else props[k] = v;
  }
  return { style, props };
}

function convertElement(e: Raw, z: number): View | null {
  const type = String(e.type ?? 'shape');
  const d = (LEGACY_DEFAULTS as Record<string, Raw>)[type] ?? LEGACY_DEFAULTS.shape;
  const merged: Raw = { ...d, ...e };
  if (type === 'node')
    merged.icons = ((merged.icons as unknown[]) ?? []).map((i) => (typeof i === 'string' ? { k: i } : i));
  const { style, props } = splitStyle(merged);
  let shape: string;
  switch (type) {
    case 'group':
      shape = 'arch.group';
      break;
    case 'node':
      shape = 'arch.card';
      break;
    case 'text':
      shape = 'common.textbox';
      break;
    case 'icon':
      shape = 'arch.icon';
      break;
    case 'shape': {
      const s = String(merged.shape ?? 'rect');
      shape = s === 'ellipse' ? 'common.oval' : s === 'diamond' ? 'common.polygon' : 'common.rectangle';
      delete props.shape;
      if (s === 'diamond') {
        props.sides = 4;
        props.rotation = 0;
      }
      break;
    }
    default:
      return null;
  }
  const w = num(merged.w, 120);
  const h = num(merged.h, 60);
  const v: View = {
    id: String(e.id || uid('v')),
    shape,
    modelId: null,
    x: num(merged.x, 0),
    y: num(merged.y, 0),
    w: w < 4 ? 120 : w,
    h: h < 4 ? 60 : h,
    z,
    parentId: null,
    props,
    style,
  };
  if (merged.locked) v.locked = true;
  if (merged.hidden) v.hidden = true;
  return v;
}

const inside = (a: View, b: View) =>
  a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;

/** Nhóm cũ chứa phần tử theo vị trí; ở engine mới dùng parentId → chọn nhóm nhỏ nhất bao trọn và nằm dưới phần tử. */
function assignParents(views: View[]): void {
  const groups = views.filter((v) => v.shape === 'arch.group');
  for (const v of views) {
    let best: View | null = null;
    for (const g of groups) {
      if (g === v || g.z >= v.z || !inside(v, g)) continue;
      if (!best || g.w * g.h < best.w * best.h) best = g;
    }
    v.parentId = best ? best.id : null;
  }
}

function convertEdge(e: Raw, z: number, ids: Set<string>): Connector | null {
  const m: Raw = { ...LEGACY_EDGE_DEFAULTS, ...e };
  const from = (m.from ?? {}) as Raw;
  const to = (m.to ?? {}) as Raw;
  if (!ids.has(String(from.id)) || !ids.has(String(to.id))) return null;
  const side = (s: unknown, d: Side): Side => (SIDES.includes(s as Side) ? (s as Side) : d);
  const pts = Array.isArray(m.points) ? (m.points as Raw[]).map((p) => ({ x: num(p.x, 0), y: num(p.y, 0) })) : [];
  const routing: Routing = pts.length
    ? 'manual'
    : m.routing === 'straight'
      ? 'straight'
      : m.routing === 'smart'
        ? 'smart'
        : 'orthogonal';
  const label = String(m.label ?? '');
  return {
    id: String(e.id || uid('c')),
    kind: 'arch.link',
    modelId: null,
    source: { viewId: String(from.id), side: side(from.side, 'bottom'), t: num(from.t, 0.5) },
    target: { viewId: String(to.id), side: side(to.side, 'top'), t: num(to.t, 0.5) },
    routing,
    waypoints: pts,
    labels: label ? [{ role: 'name', text: label, pos: num(m.labelPos, 0.5) }] : [],
    props: { dash: !!m.dash, arrowStart: !!m.arrowStart, arrowEnd: !!m.arrowEnd, radius: num(m.radius, 8) },
    style: { stroke: String(m.color), strokeWidth: num(m.width, 1.6) },
    z,
  };
}

/** Phần sơ đồ kiến trúc của file cũ (elements + edges). */
export function legacyArchitecture(raw: Raw): Pick<DiagramRecord, 'views' | 'connectors' | 'canvas'> {
  const els = Array.isArray(raw.elements) ? (raw.elements as Raw[]) : [];
  const views = els.map((e, i) => convertElement(e, i)).filter((v): v is View => !!v);
  assignParents(views);
  const ids = new Set(views.map((v) => v.id));
  const edges = Array.isArray(raw.edges) ? (raw.edges as Raw[]) : [];
  const connectors = edges.map((e, i) => convertEdge(e, views.length + i, ids)).filter((c): c is Connector => !!c);
  return {
    views,
    connectors,
    canvas: { background: typeof raw.background === 'string' ? raw.background : '#FFFFFF', grid: true },
  };
}

/**
 * migrateLegacyUnipark(json) → ProjectBundle: 1 sơ đồ kiến trúc (nếu có elements) + Gantt theo sprint + Gantt theo module.
 * Id phần tử cũ được giữ nguyên trong bundle (nhập vào project thì gọi regenerateIds).
 */
export function migrateLegacyUnipark(
  json: unknown,
  opts: { folderId?: string | null; now?: string } = {},
): ProjectBundle {
  if (!isLegacyUnipark(json)) throw new Error('Không phải tệp UniPark+ Diagram Studio ("format": "unipark-diagram").');
  const raw = json as Raw;
  const now = opts.now ?? new Date().toISOString();
  const folderId = opts.folderId ?? null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Sơ đồ';
  const diagrams: DiagramRecord[] = [];
  const base = { folderId, createdAt: now, updatedAt: now, generatedFrom: null };
  if (Array.isArray(raw.elements) && raw.elements.length) {
    const a = legacyArchitecture(raw);
    diagrams.push({ ...base, id: uid('dg'), type: 'architecture', name, order: 0, ...a, data: null });
  }
  const gantts: [string, 'sprint' | 'module', string][] = [
    ['gantt', 'sprint', 'Tiến độ theo sprint'],
    ['moduleGantt', 'module', 'Tiến độ theo module'],
  ];
  for (const [key, board, label] of gantts) {
    const g = raw[key];
    if (!isPlainObject(g)) continue;
    diagrams.push({
      ...base,
      id: uid('dg'),
      type: 'gantt',
      name: label,
      order: diagrams.length,
      canvas: { background: '#FFFFFF', grid: false },
      views: [],
      connectors: [],
      data: normGantt(g, board),
    });
  }
  return {
    project: {
      id: '',
      name: name.replace(/\s*[—-]?\s*Kiến trúc.*$/i, '') || name,
      description: 'Nhập từ UniPark+ Diagram Studio',
      color: '#2E62E6',
      icon: 'car',
    },
    folders: [],
    diagrams,
    model: [],
    meta: {},
  };
}
