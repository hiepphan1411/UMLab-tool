// Bố cục Sequence Diagram (docs/spec/notation-sequence.md mục 1): đánh số lồng `1`, `1.1`, `1.1.2`, activation bar tự
// tính và toạ độ đầu mút message — thuần, không phụ thuộc renderer.
//
// Mô hình thực thi một luồng (call stack): message gọi (sync/async/create/recursive…) mở một "frame" (activation) trên
// lifeline đích; reply đóng frame đang mở của lifeline gửi; lifeline gửi một message khi đang có frame sâu hơn ở trên
// → các frame đó coi như đã trả về (kết thúc tại hoạt động cuối). Message từ lifeline không có activation (actor khởi
// phát) là message cấp 1.

export type SeqMsgKind =
  | 'sync'
  | 'async'
  | 'reply'
  | 'duration'
  | 'create'
  | 'self'
  | 'recursive'
  | 'found'
  | 'lost'
  | 'reentrant'
  | 'destroy';

export const SEQ_MSG_KINDS: readonly SeqMsgKind[] = [
  'sync',
  'async',
  'reply',
  'duration',
  'create',
  'self',
  'recursive',
  'found',
  'lost',
  'reentrant',
  'destroy',
];

/** Bề rộng activation bar, độ lệch mỗi cấp lồng, vòng tự gọi. */
export const SEQ = {
  actW: 12,
  actNest: 6,
  actMin: 20,
  actPad: 10,
  selfW: 34,
  selfH: 22,
  /** độ dài mặc định của found / lost message. */
  freeLen: 110,
} as const;

/** Message mở activation trên lifeline đích. */
const OPENS = new Set<SeqMsgKind>(['sync', 'async', 'duration', 'create', 'recursive', 'reentrant', 'found']);

export interface SeqLifelineIn {
  id: string;
  /** toạ độ x của đường lifeline. */
  cx: number;
  /** nửa bề rộng hộp đầu (Create Message trỏ vào cạnh hộp đầu). */
  headHalf?: number;
}

export interface SeqMessageIn {
  id: string;
  kind: SeqMsgKind;
  from: string | null;
  to: string | null;
  /** y đầu nguồn. */
  y: number;
  /** y đầu đích (Duration Message xiên xuống); mặc định = y. */
  y2?: number;
  /** đầu tự do của found / lost. */
  fromX?: number;
  toX?: number;
}

export interface SeqActivation {
  lifelineId: string;
  msgId: string;
  y1: number;
  y2: number;
  depth: number;
}

export type Pt2 = [number, number];

export interface SeqMessageOut {
  number: string;
  pts: Pt2[];
}

export interface SeqIssue {
  msgId: string;
  kind: 'unmatchedReply' | 'afterDestroy';
}

export interface SeqResult {
  messages: Map<string, SeqMessageOut>;
  activations: SeqActivation[];
  /** y của dấu ✕ (Destroy) theo lifeline. */
  destroyed: Map<string, number>;
  issues: SeqIssue[];
}

interface Frame {
  lifeline: string;
  msgId: string;
  caller: string | null;
  y1: number;
  last: number;
  depth: number;
  number: string;
}

/** Số thứ tự, activation và đường đi của mọi message. `numbering=false` → số rỗng. */
export function computeSequence(
  lifelines: SeqLifelineIn[],
  messages: SeqMessageIn[],
  o: {
    numbering?: boolean;
    /** Fragment có các operand thay thế nhau (alt, par): y khung + y các vạch ngăn. Mỗi operand bắt đầu lại từ
     * trạng thái lúc vào fragment (activation của nhánh trước không làm tắt activation của nhánh sau). */
    alternatives?: { y: number; dividers: number[] }[];
  } = {},
): SeqResult {
  const ll = new Map(lifelines.map((l) => [l.id, l]));
  const order = messages
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => (!m.from || ll.has(m.from)) && (!m.to || ll.has(m.to)) && (m.from || m.to))
    .sort((a, b) => a.m.y - b.m.y || a.i - b.i)
    .map(({ m }) => m);
  const stack: Frame[] = [];
  const counters = new Map<string, number>();
  const activations: SeqActivation[] = [];
  const out = new Map<string, SeqMessageOut>();
  const issues: SeqIssue[] = [];
  const destroyed = new Map<string, number>();

  const close = (f: Frame, y2: number) => {
    const end = Math.max(f.y1 + SEQ.actMin, y2);
    activations.push({ lifelineId: f.lifeline, msgId: f.msgId, y1: f.y1, y2: end, depth: f.depth });
    return end;
  };
  /** bỏ các frame phía trên vị trí i (trả về ngầm); frame cha kết thúc sau frame con. */
  const popAbove = (i: number) => {
    while (stack.length > i + 1) {
      const f = stack.pop()!;
      const end = close(f, f.last + SEQ.actPad);
      const parent = stack[stack.length - 1];
      if (parent) parent.last = Math.max(parent.last, end);
    }
  };
  const deepest = (l: string | null) => {
    if (!l) return -1;
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].lifeline === l) return i;
    return -1;
  };
  const depthOn = (l: string) => stack.filter((f) => f.lifeline === l).length;
  const cx = (l: string) => ll.get(l)!.cx;
  /** cạnh activation (hoặc chính đường lifeline) phía hướng `toward`. */
  const edge = (l: string, depth: number | null, toward: number) => {
    if (depth === null) return cx(l);
    const left = cx(l) - SEQ.actW / 2 + depth * SEQ.actNest;
    return toward >= cx(l) ? left + SEQ.actW : left;
  };
  const next = (key: string) => {
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    return key ? `${key}.${n}` : String(n);
  };

  // sự kiện vùng thay thế theo y: vào fragment → chụp trạng thái; qua vạch ngăn → khôi phục
  type Snap = { frames: Frame[]; at: number };
  const events = (o.alternatives ?? [])
    .flatMap((a, k) => [{ y: a.y, k, start: true }, ...a.dividers.map((y) => ({ y, k, start: false }))])
    .sort((a, b) => a.y - b.y || Number(b.start) - Number(a.start));
  const snaps = new Map<number, Snap>();
  let ev = 0;
  const runEvents = (y: number) => {
    for (; ev < events.length && events[ev].y <= y; ev++) {
      const e = events[ev];
      if (e.start) {
        snaps.set(e.k, { frames: [...stack], at: activations.length });
        continue;
      }
      const snap = snaps.get(e.k);
      if (!snap) continue;
      const keep = new Set(snap.frames);
      // frame mở trong operand trước mà không có trong ảnh chụp → kết thúc
      for (let i = stack.length - 1; i >= 0; i--) if (!keep.has(stack[i])) close(stack[i], stack[i].last + SEQ.actPad);
      // frame của ảnh chụp đã bị đóng trong operand trước → mở lại (bỏ đoạn activation vừa đóng)
      const ids = new Set(snap.frames.map((f) => f.msgId));
      for (let i = activations.length - 1; i >= snap.at; i--)
        if (ids.has(activations[i].msgId)) activations.splice(i, 1);
      stack.length = 0;
      stack.push(...snap.frames);
    }
  };

  for (const m of order) {
    runEvents(m.y);
    const y1 = m.y;
    const self = !!m.from && m.from === m.to;
    const kind: SeqMsgKind = self && (m.kind === 'sync' || m.kind === 'reentrant') ? 'recursive' : m.kind;
    const y2 = self ? y1 + SEQ.selfH : kind === 'duration' ? Math.max(y1, m.y2 ?? y1) : y1;

    if (m.from && destroyed.has(m.from) && y1 > destroyed.get(m.from)!)
      issues.push({ msgId: m.id, kind: 'afterDestroy' });
    else if (m.to && destroyed.has(m.to) && y2 > destroyed.get(m.to)!)
      issues.push({ msgId: m.id, kind: 'afterDestroy' });

    // ngữ cảnh gửi
    let ctx = deepest(m.from);
    if (ctx >= 0) popAbove(ctx);
    else if (m.from && kind !== 'reply') popAbove(-1); // tác nhân khởi phát lượt mới → kết thúc mọi activation
    const ctxFrame = ctx >= 0 ? stack[ctx] : null;

    const number = kind === 'reply' || o.numbering === false ? '' : next(ctxFrame?.number ?? '');
    const srcDepth = ctxFrame ? ctxFrame.depth : null;
    let pts: Pt2[];

    if (kind === 'reply') {
      if (!ctxFrame || ctxFrame.caller !== m.to) issues.push({ msgId: m.id, kind: 'unmatchedReply' });
      const toward = m.to ? cx(m.to) : (m.toX ?? cx(m.from!) - SEQ.freeLen);
      const sx = m.from ? edge(m.from, srcDepth, toward) : (m.fromX ?? toward - SEQ.freeLen);
      if (ctxFrame) {
        stack.pop();
        close(ctxFrame, y1);
        ctx = -1;
      }
      const ti = deepest(m.to);
      const tx = m.to ? edge(m.to, ti >= 0 ? stack[ti].depth : null, sx) : toward;
      pts = [
        [sx, y1],
        [tx, y2],
      ];
    } else if (self) {
      const sx = edge(m.from!, srcDepth, Infinity);
      if (kind === 'recursive') {
        const depth = depthOn(m.from!);
        const f: Frame = { lifeline: m.from!, msgId: m.id, caller: m.from, y1: y2, last: y2, depth, number };
        stack.push(f);
        const tx = edge(m.from!, depth, Infinity);
        pts = [
          [sx, y1],
          [sx + SEQ.selfW, y1],
          [sx + SEQ.selfW, y2],
          [tx, y2],
        ];
      } else
        pts = [
          [sx, y1],
          [sx + SEQ.selfW, y1],
          [sx + SEQ.selfW, y2],
          [sx, y2],
        ];
    } else {
      const sxBase = m.from ? cx(m.from) : (m.fromX ?? (m.to ? cx(m.to) - SEQ.freeLen : 0));
      const txBase = m.to ? cx(m.to) : (m.toX ?? sxBase + SEQ.freeLen);
      const sx = m.from ? edge(m.from, srcDepth, txBase) : sxBase;
      let tx = txBase;
      if (m.to && OPENS.has(kind)) {
        const depth = depthOn(m.to);
        stack.push({ lifeline: m.to, msgId: m.id, caller: m.from, y1: y2, last: y2, depth, number });
        tx =
          kind === 'create' ? txBase + (sx < txBase ? -1 : 1) * (ll.get(m.to)!.headHalf ?? 0) : edge(m.to, depth, sx);
      } else if (m.to && kind !== 'destroy') {
        const ti = deepest(m.to);
        tx = edge(m.to, ti >= 0 ? stack[ti].depth : null, sx);
      }
      if (kind === 'destroy' && m.to && !destroyed.has(m.to)) destroyed.set(m.to, y2);
      pts = [
        [sx, y1],
        [tx, y2],
      ];
    }
    for (const f of stack) f.last = Math.max(f.last, y2);
    out.set(m.id, { number, pts });
  }
  popAbove(-1);
  // activation không vượt quá dấu ✕
  for (const a of activations) {
    const d = destroyed.get(a.lifelineId);
    if (d !== undefined && a.y2 > d) a.y2 = Math.max(a.y1 + 4, d);
  }
  return { messages: out, activations, destroyed, issues };
}
