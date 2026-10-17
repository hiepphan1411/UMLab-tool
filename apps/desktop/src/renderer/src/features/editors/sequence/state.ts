// Bố cục Sequence trên engine (docs/spec/notation-sequence.md mục 1): đọc lifeline / message / fragment từ sơ đồ,
// tính số thứ tự + activation bằng `computeSequence` (core, có cache), chuẩn hoá sau mỗi giao dịch (lifeline thẳng
// hàng, hạ hộp đầu khi Create, kéo dài theo message, cắt tại Destroy), kéo message đổi thứ tự / chèn khoảng.
import {
  computeSequence,
  type Connector,
  type SeqMessageIn,
  type SeqMsgKind,
  type SeqResult,
  type View,
} from '@umlab/core';
import type { EngineLookup, Tx } from '../engine/registry';

type P = Record<string, unknown>;

export const LIFELINE_SHAPES = new Set(['seq.lifeline', 'seq.boundary', 'seq.control', 'seq.entity', 'seq.actor']);
export const isLifeline = (v: Pick<View, 'shape'> | undefined): boolean => !!v && LIFELINE_SHAPES.has(v.shape);
/** Chiều cao phần đầu (hộp tên / biểu tượng + tên). */
export const headH = (v: Pick<View, 'shape'>) => (v.shape === 'seq.lifeline' ? 40 : 64);
export const lifelineCx = (v: Pick<View, 'x' | 'w'>) => v.x + v.w / 2;
/** Fragment phủ lifeline theo x. */
export const COVERING = new Set(['seq.fragment', 'seq.ref']);

export const msgKind = (kind: string): SeqMsgKind | null => {
  const k = kind.startsWith('seq.') ? kind.slice(4) : '';
  return (
    [
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
    ] as const
  ).includes(k as SeqMsgKind)
    ? (k as SeqMsgKind)
    : null;
};

export const msgY = (c: Pick<Connector, 'source' | 'target'>) => c.source.y ?? c.target.y ?? 0;

export function msgInput(c: Connector): SeqMessageIn | null {
  const kind = msgKind(c.kind);
  if (!kind) return null;
  return {
    id: c.id,
    kind,
    from: c.source.viewId,
    to: c.target.viewId,
    y: msgY(c),
    y2: c.target.y,
    fromX: c.source.viewId ? undefined : c.source.x,
    toX: c.target.viewId ? undefined : c.target.x,
  };
}

export interface Operand {
  guard: string;
  /** vị trí vạch ngăn tính từ đỉnh fragment (operand đầu = 0). */
  y: number;
}
export const operandsOf = (props: P): Operand[] =>
  Array.isArray(props.operands) && props.operands.length
    ? (props.operands as Operand[]).map((o, i) => ({
        guard: String(o?.guard ?? ''),
        y: i === 0 ? 0 : Number(o?.y) || 0,
      }))
    : [{ guard: '', y: 0 }];

const ALT_OPERATORS = new Set(['alt', 'par']);

function inputs(lookup: EngineLookup) {
  const lifelines = lookup.views().filter((v) => isLifeline(v) && !v.hidden);
  const frags = lookup.views().filter((v) => v.shape === 'seq.fragment' && ALT_OPERATORS.has(String(v.props.operator)));
  const msgs = lookup.conns().filter((c) => msgKind(c.kind));
  const numbering = lookup.diagram(lookup.diagramId)?.canvas?.numbering !== false;
  return { lifelines, frags, msgs, numbering };
}

const cache = new WeakMap<EngineLookup, { key: unknown[]; res: SeqResult }>();
const same = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Số thứ tự / activation / đường đi của mọi message (cache theo đối tượng hình & đường nối). */
export function seqResult(lookup: EngineLookup): SeqResult {
  const { lifelines, frags, msgs, numbering } = inputs(lookup);
  const key: unknown[] = [numbering, ...lifelines, '|', ...frags, '|', ...msgs];
  const hit = cache.get(lookup);
  if (hit && same(hit.key, key)) return hit.res;
  const res = computeSequence(
    lifelines.map((v) => ({ id: v.id, cx: lifelineCx(v), headHalf: v.w / 2 })),
    msgs.map(msgInput).filter((m): m is SeqMessageIn => !!m),
    {
      numbering,
      alternatives: frags.map((f) => ({
        y: f.y,
        dividers: operandsOf(f.props)
          .slice(1)
          .map((o) => f.y + o.y),
      })),
    },
  );
  cache.set(lookup, { key, res });
  return res;
}

// ------------------------------------------------ chuẩn hoá bố cục ------------------------------------------------

const GAP = 40;

export function normalizeSequence(tx: Tx): void {
  const views = tx.allViews();
  const lls = views.filter((v) => isLifeline(v) && !v.hidden).sort((a, b) => a.x - b.x);
  if (!lls.length) return;
  const msgs = tx.allConns().filter((c) => msgKind(c.kind));

  // message ngang: đầu đích cùng y đầu nguồn (Duration Message được xiên xuống)
  for (const c of msgs) {
    const k = msgKind(c.kind)!;
    const y = msgY(c);
    const ty = c.target.y;
    const want = k === 'duration' ? Math.max(y + 8, ty ?? y + 30) : y;
    const patch: Partial<Connector> = {};
    if (c.source.y !== y) patch.source = { ...c.source, y };
    if (ty !== want) patch.target = { ...c.target, y: want };
    if (patch.source || patch.target) tx.setConn(c.id, patch);
  }
  const ms = tx.allConns().filter((c) => msgKind(c.kind));

  // khoảng cách tối thiểu giữa lifeline kề nhau (kéo qua lifeline khác = đổi thứ tự)
  for (let i = 1; i < lls.length; i++) {
    const a = tx.view(lls[i - 1].id)!;
    const b = lls[i];
    const min = a.x + a.w + GAP;
    if (b.x < min) {
      tx.setView(b.id, { x: Math.round(min) });
      lls[i] = tx.view(b.id)!;
    }
  }

  const created = new Map<string, number>();
  const destroyed = new Map<string, number>();
  for (const c of ms) {
    const k = msgKind(c.kind);
    if (k === 'create' && c.target.viewId && !created.has(c.target.viewId)) created.set(c.target.viewId, msgY(c));
    if (k === 'destroy' && c.target.viewId) {
      const y = c.target.y ?? msgY(c);
      destroyed.set(c.target.viewId, Math.min(destroyed.get(c.target.viewId) ?? Infinity, y));
    }
  }
  const plain = lls.filter((v) => !created.has(v.id));
  const top = Math.round(Math.min(...(plain.length ? plain : lls).map((v) => v.y)));
  // chừa chỗ dưới message cuối để vẽ tiếp
  let bottom = top + 300;
  for (const c of ms) bottom = Math.max(bottom, msgY(c) + 120, (c.target.y ?? 0) + 120);
  for (const v of views)
    if (COVERING.has(v.shape) || v.shape === 'seq.continuation' || v.shape === 'seq.stateInvariant')
      bottom = Math.max(bottom, v.y + v.h + 30);
  for (const v of lls) {
    const cur = tx.view(v.id)!;
    const y = created.has(v.id) ? Math.round(created.get(v.id)! - headH(v) / 2) : top;
    const end = destroyed.has(v.id) ? destroyed.get(v.id)! + 12 : bottom;
    const h = Math.max(headH(v) + 30, Math.round(end - y));
    if (cur.y !== y || cur.h !== h) tx.setView(v.id, { y, h });
  }

  // fragment / ref tự phủ trọn các lifeline có tâm nằm trong khung
  for (const f of views.filter((v) => COVERING.has(v.shape))) {
    const cur = tx.view(f.id) ?? f;
    const inside = lls
      .map((v) => tx.view(v.id)!)
      .filter((v) => lifelineCx(v) >= cur.x && lifelineCx(v) <= cur.x + cur.w);
    if (!inside.length) continue;
    const x1 = Math.min(cur.x, ...inside.map((v) => v.x - 12));
    const x2 = Math.max(cur.x + cur.w, ...inside.map((v) => v.x + v.w + 12));
    if (x1 !== cur.x || x2 !== cur.x + cur.w) tx.setView(f.id, { x: x1, w: x2 - x1 });
  }
}

// ------------------------------------------------ kéo message ------------------------------------------------

const shift = (c: Connector, dy: number): Partial<Connector> => ({
  source: { ...c.source, y: (c.source.y ?? msgY(c)) + dy },
  target: { ...c.target, y: (c.target.y ?? msgY(c)) + dy },
});

/** Xem trước khi kéo: message đang kéo dời theo chuột. */
export function previewMsgDrag(c: Connector, dy: number): Map<string, Partial<Connector>> {
  return new Map([[c.id, shift(c, dy)]]);
}

/** Thả: không Shift → chỉ dời message (đổi thứ tự); Shift → chèn khoảng trống: mọi message / fragment phía dưới cùng
 * dời theo. Reply kèm theo message gọi nếu nằm ngay dưới (giữ cặp gọi – trả về). */
export function commitMsgDrag(tx: Tx, c: Connector, dy: number, mods: { shift: boolean }): void {
  const y0 = msgY(c);
  if (!mods.shift) {
    tx.setConn(c.id, shift(c, dy));
    return;
  }
  for (const x of tx.allConns()) {
    if (!msgKind(x.kind)) continue;
    if (x.id === c.id || msgY(x) > y0) tx.setConn(x.id, shift(x, dy));
  }
  for (const v of tx.allViews()) {
    if (isLifeline(v)) continue;
    if (v.y > y0 && v.shape.startsWith('seq.')) tx.setView(v.id, { y: v.y + dy });
    else if (v.shape === 'seq.fragment' && v.y < y0 && v.y + v.h > y0) tx.setView(v.id, { h: Math.max(30, v.h + dy) });
  }
}
