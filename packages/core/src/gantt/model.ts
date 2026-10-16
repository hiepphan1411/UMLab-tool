// Mô hình Gantt — port nguyên logic từ tool cũ (docs/reference/diagram-studio/index.html, mục GANTT MODEL).
import { uid } from '../util/ids';

export const DAYMS = 86_400_000;

/** "2026-08-04" → số ngày kể từ 1970-01-01 (UTC). NaN nếu sai định dạng. */
export function dn(s: unknown): number {
  if (!s || typeof s !== 'string') return NaN;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return NaN;
  return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAYMS);
}
export const ds = (n: number) => new Date(n * DAYMS).toISOString().slice(0, 10);
export const dOf = (n: number) => new Date(n * DAYMS);
export function ddm(n: number) {
  const d = dOf(n);
  return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
export const ddmy = (n: number) => ddm(n) + '/' + dOf(n).getUTCFullYear();
export const wdOf = (n: number) => dOf(n).getUTCDay();
export const mondayOf = (n: number) => n - ((wdOf(n) + 6) % 7);
export function firstOfMonth(n: number) {
  const d = dOf(n);
  return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / DAYMS);
}
export function nextMonth(n: number) {
  const d = dOf(n);
  return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / DAYMS);
}
export function isoWeek(n: number) {
  const th = mondayOf(n) + 3;
  const y = dOf(th).getUTCFullYear();
  const j4 = Math.round(Date.UTC(y, 0, 4) / DAYMS);
  return 1 + Math.round((mondayOf(n) - mondayOf(j4)) / 7);
}
export function todayDn() {
  const t = new Date();
  return Math.round(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / DAYMS);
}
export const WD_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export type GanttStatus = 'done' | 'progress' | 'risk' | 'late' | 'todo' | 'paused';

export const GST: Record<GanttStatus, { n: string; c: string }> = {
  done: { n: 'Hoàn thành', c: '#1F9D66' },
  progress: { n: 'Đang thực hiện', c: '#2E6BE6' },
  risk: { n: 'Có rủi ro', c: '#D98A1C' },
  late: { n: 'Trễ hạn', c: '#D9463E' },
  todo: { n: 'Chưa bắt đầu', c: '#8A93A5' },
  paused: { n: 'Tạm dừng', c: '#7C5CC4' },
};

export const GCOLS = [
  { k: 'code', l: 'Sprint', w: 96 },
  { k: 'name', l: 'Giai đoạn', w: 214 },
  { k: 'start', l: 'Bắt đầu', w: 88 },
  { k: 'end', l: 'Kết thúc', w: 88 },
  { k: 'days', l: 'Số ngày', w: 64 },
  { k: 'owner', l: 'Phụ trách', w: 132 },
  { k: 'status', l: 'Trạng thái', w: 132 },
  { k: 'progress', l: 'Tiến độ', w: 136 },
] as const;

export type GanttColumn = (typeof GCOLS)[number]['k'];

export interface GanttItem {
  t: string;
  done: boolean;
}

export interface GanttTask {
  id: string;
  type: 'task' | 'milestone';
  code: string;
  name: string;
  start: string;
  end: string;
  goal: string;
  deliverables: string;
  owner: string;
  jira: string;
  progress: number;
  status: GanttStatus | 'auto';
  icon: string;
  items: GanttItem[];
  autoProg: boolean;
}

export interface GanttData {
  title: string;
  reportDate: string;
  scale: 'day' | 'week' | 'month';
  weekends: boolean;
  columns: Record<GanttColumn, boolean>;
  /** Bảng theo sprint hay theo module (một sơ đồ Gantt = một bảng). */
  board: 'sprint' | 'module';
  tasks: GanttTask[];
}

export const GANTT_DEFAULT: Omit<GanttData, 'tasks' | 'board'> = {
  title: 'Tiến độ dự án',
  reportDate: '',
  scale: 'week',
  weekends: true,
  columns: {
    code: true,
    name: true,
    start: false,
    end: false,
    days: false,
    owner: true,
    status: false,
    progress: true,
  },
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function syncProg(t: GanttTask): void {
  if (t.autoProg && t.items.length)
    t.progress = Math.round((t.items.filter((i) => i.done).length / t.items.length) * 100);
}

export function normTask(raw: unknown): GanttTask {
  const t = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));
  const items = Array.isArray(t.items)
    ? (t.items as Record<string, unknown>[]).map((i) => ({ t: str(i?.t ?? i?.text), done: !!i?.done }))
    : [];
  const o: GanttTask = {
    id: typeof t.id === 'string' && t.id ? t.id : uid('task'),
    type: t.type === 'milestone' ? 'milestone' : 'task',
    code: str(t.code),
    name: str(t.name, 'Giai đoạn mới'),
    start: str(t.start),
    end: str(t.end ?? t.start),
    goal: str(t.goal),
    deliverables: str(t.deliverables),
    owner: str(t.owner),
    jira: str(t.jira),
    progress: clamp(Math.round(Number(t.progress) || 0), 0, 100),
    status: typeof t.status === 'string' && t.status in GST ? (t.status as GanttStatus) : 'auto',
    icon: str(t.icon),
    items,
    autoProg: !!t.autoProg,
  };
  syncProg(o);
  if (isNaN(dn(o.start))) o.start = ds(todayDn());
  if (isNaN(dn(o.end)) || dn(o.end) < dn(o.start)) o.end = o.start;
  if (o.type === 'milestone') o.end = o.start;
  return o;
}

export function normGantt(raw: unknown, board: 'sprint' | 'module' = 'sprint'): GanttData {
  const g = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const scale = g.scale === 'day' || g.scale === 'month' ? g.scale : 'week';
  return {
    ...GANTT_DEFAULT,
    title: typeof g.title === 'string' ? g.title : GANTT_DEFAULT.title,
    reportDate: typeof g.reportDate === 'string' ? g.reportDate : '',
    scale,
    weekends: g.weekends === undefined ? true : !!g.weekends,
    columns: { ...GANTT_DEFAULT.columns, ...((g.columns as object) ?? {}) },
    board: g.board === 'module' || g.board === 'sprint' ? g.board : board,
    tasks: Array.isArray(g.tasks) ? g.tasks.map(normTask) : [],
  };
}

export function reportDay(g: Pick<GanttData, 'reportDate'>): number {
  const r = dn(g.reportDate);
  return isNaN(r) ? todayDn() : r;
}
export const durOf = (t: Pick<GanttTask, 'start' | 'end'>) => dn(t.end) - dn(t.start) + 1;
export function plannedPct(t: GanttTask, rd: number): number {
  const s = dn(t.start);
  const e = dn(t.end);
  if (rd < s) return 0;
  if (rd >= e) return 100;
  return Math.round(((rd - s + 1) / (e - s + 1)) * 100);
}
export function statusOf(t: GanttTask, rd: number): GanttStatus {
  if (t.status && t.status !== 'auto') return t.status;
  if (t.progress >= 100) return 'done';
  const s = dn(t.start);
  const e = dn(t.end);
  if (rd > e) return 'late';
  if (rd < s) return t.progress > 0 ? 'progress' : 'todo';
  return t.progress + 20 < plannedPct(t, rd) ? 'risk' : 'progress';
}

export function gSummary(g: GanttData) {
  const rd = reportDay(g);
  const ts = g.tasks.filter((t) => t.type !== 'milestone');
  const tot = ts.reduce((a, t) => a + durOf(t), 0) || 1;
  const overall = Math.round(ts.reduce((a, t) => a + durOf(t) * t.progress, 0) / tot);
  const planned = Math.round(ts.reduce((a, t) => a + durOf(t) * plannedPct(t, rd), 0) / tot);
  const cnt: Partial<Record<GanttStatus, number>> = {};
  g.tasks.forEach((t) => {
    const s = statusOf(t, rd);
    cnt[s] = (cnt[s] ?? 0) + 1;
  });
  const mn = g.tasks.length ? Math.min(...g.tasks.map((t) => dn(t.start))) : rd;
  const mx = g.tasks.length ? Math.max(...g.tasks.map((t) => dn(t.end))) : rd;
  return { rd, overall, planned, cnt, mn, mx, left: mx - rd, total: ts.length };
}

// ---------------- dán từ Excel / Google Sheets ----------------

export function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
    } else if (ch === '"' && f === '') q = true;
    else if (ch === '\t') {
      row.push(f);
      f = '';
    } else if (ch === '\n') {
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else if (ch !== '\r') f += ch;
  }
  if (f || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export function parseDateCell(v: unknown, fmt: 'mdy' | 'dmy'): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s))
    return ds(
      dn(
        s
          .split('-')
          .map((x, i) => (i ? x.padStart(2, '0') : x))
          .join('-'),
      ),
    );
  if (/^\d{5}(\.\d+)?$/.test(s)) return ds(Math.round(Date.UTC(1899, 11, 30) / DAYMS) + Math.floor(+s));
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return '';
  const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  const a = +m[1];
  const b = +m[2];
  const [mo, da] = fmt === 'dmy' ? [b, a] : [a, b];
  return ds(Math.round(Date.UTC(y, mo - 1, da) / DAYMS));
}

const HEAD_MAP: [string, RegExp][] = [
  ['start', /bắt đầu|start|begin/i],
  ['end', /kết thúc|end|finish|hạn/i],
  ['progress', /tiến độ|progress|%|hoàn thành/i],
  ['jira', /jira|ticket/i],
  ['owner', /phụ trách|owner|người|assignee/i],
  ['deliverables', /deliverable|sản phẩm|kết quả/i],
  ['goal', /mục tiêu|goal|objective/i],
  ['name', /tên|giai đoạn|phase|name|nội dung/i],
  ['code', /sprint|mã|code|id/i],
];
const DEFAULT_ORDER = ['code', 'name', 'start', 'end', 'goal', 'deliverables', 'owner', 'jira', 'progress'];

export function rowsToTasks(rowsIn: string[][], fmt: 'mdy' | 'dmy'): GanttTask[] {
  let rows = rowsIn;
  if (!rows.length) return [];
  let map: (string | null)[];
  const head = rows[0].map((h) => HEAD_MAP.find(([, re]) => re.test(h))?.[0] ?? null);
  if (head.filter(Boolean).length >= 2 && !rows[0].some((c) => parseDateCell(c, fmt))) {
    map = head;
    rows = rows.slice(1);
  } else map = DEFAULT_ORDER;
  return rows.map((r) => {
    const o: Record<string, string> = {};
    map.forEach((k, i) => {
      if (k && r[i] != null && o[k] == null) o[k] = r[i].trim();
    });
    let p =
      parseFloat(
        String(o.progress || '0')
          .replace('%', '')
          .replace(',', '.'),
      ) || 0;
    if (p > 0 && p <= 1 && /[.,]/.test(o.progress || '')) p *= 100;
    return normTask({
      code: o.code,
      name: o.name || o.code,
      start: parseDateCell(o.start, fmt),
      end: parseDateCell(o.end, fmt),
      goal: o.goal,
      deliverables: o.deliverables,
      owner: o.owner,
      jira: o.jira,
      progress: p,
    });
  });
}

export function nextCode(tasks: GanttTask[]): string {
  const nums = tasks
    .map((t) => (String(t.code).match(/(\d+)/) || [])[1])
    .filter(Boolean)
    .map(Number);
  return 'Sprint ' + (nums.length ? Math.max(...nums) + 1 : 1);
}
