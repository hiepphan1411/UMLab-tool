// Sinh lịch học từ ngày bắt đầu tới ngày thi: chia 4 giai đoạn, rải các "đơn vị học" (do nội dung cung cấp)
// đều theo ngày, xen kẽ kỹ năng để ngày nào cũng có Nghe/Đọc/Viết/Nói. Thuần dữ liệu, xác định (cùng đầu vào → cùng lịch).
import type { VstepSkill } from './schema';

export type PlanSkill = VstepSkill | 'grammar' | 'vocab' | 'mock' | 'review';
export type PlanPhase = 1 | 2 | 3 | 4;

export const PLAN_SKILL_LABEL: Record<PlanSkill, string> = {
  listening: 'Nghe',
  reading: 'Đọc',
  writing: 'Viết',
  speaking: 'Nói',
  grammar: 'Ngữ pháp',
  vocab: 'Từ vựng',
  mock: 'Thi thử',
  review: 'Ôn tập',
};

export const PLAN_PHASES: { id: PlanPhase; name: string; share: number; goal: string }[] = [
  {
    id: 1,
    name: 'Nền tảng & học template',
    share: 0.35,
    goal: 'Nắm cấu trúc đề, thuộc template Viết/Nói, ngữ pháp cốt lõi',
  },
  { id: 2, name: 'Luyện từng phần', share: 0.35, goal: 'Luyện từng dạng câu hỏi Nghe/Đọc, viết bài theo template' },
  { id: 3, name: 'Luyện đề tổng hợp', share: 0.2, goal: 'Làm đề đủ 4 kỹ năng, canh giờ như thi thật' },
  { id: 4, name: 'Ôn tập & thi thử', share: 0.1, goal: 'Ôn lỗi sai, học lại template, giữ sức' },
];

export interface PlanUnit {
  id: string;
  skill: PlanSkill;
  title: string;
  minutes: number;
  phase: PlanPhase;
  /** Đường dẫn trong app (vd "doc:writing#w1-informal", "track:12", "set:reading-1"). */
  link?: string;
  detail?: string;
}

export interface PlanTask extends PlanUnit {
  daily?: boolean;
}

export interface PlanDay {
  date: string;
  /** 0 = ngày đầu tiên. */
  index: number;
  /** 0 = ngày thi. */
  phase: PlanPhase | 0;
  tasks: PlanTask[];
  minutes: number;
}

const DAY = 86_400_000;
const toMs = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const dateKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => dateKey(toMs(d) + n * DAY);
export const daysBetween = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY);
/** Ngày theo giờ máy (không phải UTC) dạng YYYY-MM-DD. */
export function localDateKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Số ngày của từng giai đoạn (tổng = n, giai đoạn nào cũng ≥1 khi n ≥ 4). */
export function phaseLengths(n: number): number[] {
  if (n <= 0) return [0, 0, 0, 0];
  if (n < 4) return [1, 2, 3, 4].map((p) => (p <= n ? 1 : 0));
  const raw = PLAN_PHASES.map((p) => p.share * n);
  const len = raw.map((x) => Math.max(1, Math.floor(x)));
  let rest = n - len.reduce((a, b) => a + b, 0);
  // phần dư chia cho giai đoạn có phần lẻ lớn nhất
  const order = raw.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f);
  for (let k = 0; rest > 0; k++, rest--) len[order[k % 4].i]++;
  for (let k = 0; rest < 0; k++) {
    const i = order[order.length - 1 - (k % 4)].i;
    if (len[i] > 1) {
      len[i]--;
      rest++;
    }
  }
  return len;
}

/** Xen kẽ theo kỹ năng, giữ thứ tự bên trong từng kỹ năng. */
function interleave(units: PlanUnit[]): PlanUnit[] {
  const groups = new Map<PlanSkill, PlanUnit[]>();
  for (const u of units) groups.set(u.skill, [...(groups.get(u.skill) ?? []), u]);
  const qs = [...groups.values()];
  const out: PlanUnit[] = [];
  while (qs.some((q) => q.length)) for (const q of qs) if (q.length) out.push(q.shift()!);
  return out;
}

export interface BuildPlanInput {
  start: string;
  exam: string;
  units: PlanUnit[];
  /** Việc lặp lại mỗi ngày (ôn từ vựng…), không thêm vào ngày thi. */
  daily?: Omit<PlanUnit, 'phase'>[];
}

export function buildStudyPlan({ start, exam, units, daily = [] }: BuildPlanInput): PlanDay[] {
  const n = Math.max(0, daysBetween(start, exam));
  const lens = phaseLengths(n);
  const days: PlanDay[] = [];
  let idx = 0;
  const byPhase = (p: PlanPhase) => interleave(units.filter((u) => u.phase === p));
  // Giai đoạn bị gộp (lịch quá ngắn): đơn vị của giai đoạn không có ngày dồn sang giai đoạn kế tiếp có ngày.
  let carry: PlanUnit[] = [];
  PLAN_PHASES.forEach((ph, pi) => {
    const queue = [...carry, ...byPhase(ph.id)];
    carry = [];
    const len = lens[pi];
    if (!len) {
      carry = queue;
      return;
    }
    for (let d = 0; d < len; d++) {
      const remainingDays = len - d;
      const take = Math.ceil(queue.length / remainingDays);
      const date = addDays(start, idx);
      const tasks: PlanTask[] = [
        ...queue.splice(0, take),
        ...daily.map((u) => ({ ...u, id: `${u.id}@${date}`, phase: ph.id, daily: true })),
      ];
      days.push({ date, index: idx, phase: ph.id, tasks, minutes: tasks.reduce((a, t) => a + t.minutes, 0) });
      idx++;
    }
  });
  // giai đoạn cuối không có ngày (lịch quá ngắn) → dồn phần còn lại vào ngày học cuối
  const last = days.at(-1);
  if (carry.length && last) {
    last.tasks.splice(last.tasks.length - daily.length, 0, ...carry);
    last.minutes += carry.reduce((a, t) => a + t.minutes, 0);
  }
  const examTask: PlanTask = {
    id: 'exam-day',
    skill: 'mock',
    title: 'Ngày thi VSTEP',
    minutes: 180,
    phase: 4,
    detail: 'Mang CCCD, đến sớm 30 phút. Nghe → Đọc → Viết liền mạch, Nói thi riêng trên máy.',
  };
  days.push({ date: n > 0 ? addDays(start, n) : exam, index: n, phase: 0, tasks: [examTask], minutes: 0 });
  return days;
}

export interface PlanProgress {
  done: number;
  total: number;
  pct: number;
}

/** Tiến độ của danh sách ngày theo bản ghi đã xong (ngày → id việc → true). */
export function planProgress(days: PlanDay[], done: Record<string, Record<string, boolean>>): PlanProgress {
  let d = 0;
  let t = 0;
  for (const day of days)
    for (const task of day.tasks) {
      if (task.id === 'exam-day') continue;
      t++;
      if (done[day.date]?.[task.id]) d++;
    }
  return { done: d, total: t, pct: t ? Math.round((d / t) * 100) : 0 };
}

/** Chuỗi ngày liên tiếp (tính tới `today`) có ít nhất một việc đã xong. */
export function streak(done: Record<string, Record<string, boolean>>, today: string): number {
  const has = (d: string) => Object.values(done[d] ?? {}).some(Boolean);
  let s = 0;
  let d = has(today) ? today : addDays(today, -1);
  while (has(d)) {
    s++;
    d = addDays(d, -1);
  }
  return s;
}
