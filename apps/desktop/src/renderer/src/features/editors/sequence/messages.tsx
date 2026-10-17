// Message Sequence (docs/spec/notation-sequence.md mục 3): Sync / Async / Reply / Duration / Create / Self / Recursive /
// Found / Lost / Reentrant / Destroy. Đường đi + số thứ tự do bố cục Sequence tính (state.seqResult); kéo thân message
// lên/xuống đổi thứ tự, Shift + kéo chèn khoảng trống; tên message gợi ý operation của class gắn với lifeline đích.
import { useEffect, useState } from 'react';
import { parseOperation, type Connector, type ModelElement, type Operation, type SeqMsgKind } from '@umlab/core';
import { confirmDialog } from '@/ui';
import {
  registerConnector,
  type ComputedLabel,
  type ConnLook,
  type EngineLookup,
  type MarkerKind,
  type Tx,
} from '../engine/registry';
import type { Routed } from '../engine/route';
import { commitMsgDrag, isLifeline, lifelineCx, msgKind, msgY, previewMsgDrag, seqResult } from './state';

type P = Record<string, unknown>;
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

interface MsgDef {
  kind: SeqMsgKind;
  label: string;
  icon: string;
  line: ConnLook['line'];
  start?: MarkerKind;
  end: MarkerKind;
  stereotype?: string;
}

const DEFS: MsgDef[] = [
  { kind: 'sync', label: 'Message (Synchronous)', icon: 'message-sync', line: 'solid', end: 'arrow-filled' },
  { kind: 'async', label: 'Asynchronous Message', icon: 'message-async', line: 'solid', end: 'arrow-open' },
  { kind: 'reply', label: 'Reply Message', icon: 'message-reply', line: 'dashed', end: 'arrow-open' },
  { kind: 'duration', label: 'Duration Message', icon: 'duration-message', line: 'solid', end: 'arrow-filled' },
  {
    kind: 'create',
    label: 'Create Message',
    icon: 'create-message',
    line: 'dashed',
    end: 'arrow-open',
    stereotype: 'create',
  },
  { kind: 'self', label: 'Self Message', icon: 'self-message', line: 'solid', end: 'arrow-filled' },
  { kind: 'recursive', label: 'Recursive Message', icon: 'recursive-message', line: 'solid', end: 'arrow-filled' },
  {
    kind: 'found',
    label: 'Found Message',
    icon: 'found-message',
    line: 'solid',
    start: 'dot-filled',
    end: 'arrow-filled',
  },
  { kind: 'lost', label: 'Lost Message', icon: 'lost-message', line: 'solid', end: 'dot-filled' },
  { kind: 'reentrant', label: 'Reentrant Message', icon: 'reentrant-message', line: 'solid', end: 'arrow-filled' },
  {
    kind: 'destroy',
    label: 'Destroy Message',
    icon: 'message-sync',
    line: 'solid',
    end: 'arrow-filled',
    stereotype: 'destroy',
  },
];

/** Đường đi theo bố cục; khi đang kéo (y khác bản đã tính) → dời theo. */
function route(c: Connector, lookup: EngineLookup | undefined): Routed | null {
  if (!lookup) return null;
  const r = seqResult(lookup).messages.get(c.id);
  const stored = lookup.conn(c.id);
  if (!r) {
    // chưa có trong bố cục (vừa tạo / đang xem trước): đường thẳng giữa 2 lifeline
    const a = lookup.view(c.source.viewId);
    const b = lookup.view(c.target.viewId);
    const y = msgY(c);
    const x1 = a ? lifelineCx(a) : (c.source.x ?? 0);
    const x2 = b ? lifelineCx(b) : (c.target.x ?? x1 + 110);
    return {
      pts: [
        [x1, y],
        [x2, c.target.y ?? y],
      ],
      src: { pt: [x1, y] },
      tgt: { pt: [x2, y] },
      curved: false,
    };
  }
  const dy = stored ? msgY(c) - msgY(stored) : 0;
  const pts = r.pts.map(([x, y]) => [x, y + dy] as [number, number]);
  return { pts, src: { pt: pts[0] }, tgt: { pt: pts[pts.length - 1] }, curved: false };
}

/** Nhãn: `1.2: [guard] ten(args) : ketQua` (reply: giá trị trả về). */
export function messageText(c: Connector, number: string): string {
  const p = c.props as P;
  const kind = msgKind(c.kind);
  const name = str(p.name).trim();
  const args = str(p.arguments).trim();
  const full = args && !name.includes('(') ? `${name}(${args})` : name;
  const ret = str(p.returnValue).trim();
  const guard = str(p.guard)
    .trim()
    .replace(/^\[|\]$/g, '');
  const body = kind === 'reply' ? full || ret : `${guard ? `[${guard}] ` : ''}${full}${ret ? ` : ${ret}` : ''}`;
  const num = str(p.number).trim() || number;
  return num && body ? `${num}: ${body}` : num ? `${num}:` : body;
}

const labels = (c: Connector, _m: ModelElement | null, lookup: EngineLookup): ComputedLabel[] => {
  const number = seqResult(lookup).messages.get(c.id)?.number ?? '';
  const text = messageText(c, number);
  return text ? [{ role: 'name', text, pos: 0.5, draggable: true }] : [];
};

const OPS_OF = (lookup: EngineLookup, viewId: string | null): { cls: ModelElement; ops: Operation[] } | null => {
  const v = lookup.view(viewId);
  const m = v?.modelId ? lookup.model(v.modelId) : undefined;
  const cls = m ? lookup.model(str(m.data.baseClassifier)) : undefined;
  if (!cls) return null;
  return { cls, ops: Array.isArray(cls.data.operations) ? (cls.data.operations as Operation[]) : [] };
};

function MessageInspector({
  conn,
  apply,
  lookup,
  readOnly,
}: {
  conn: Connector;
  model: ModelElement | null;
  apply: (fn: (tx: Tx) => void) => void;
  lookup: EngineLookup;
  readOnly: boolean;
}) {
  const p = conn.props as P;
  const [name, setName] = useState(str(p.name));
  useEffect(() => setName(str(p.name)), [p.name]);
  const target = OPS_OF(lookup, conn.target.viewId);
  const kind = msgKind(conn.kind);
  const commitName = async () => {
    const v = name.trim();
    if (v === str(p.name)) return;
    const opName = v.replace(/\(.*$/s, '').trim();
    const op = target?.ops.find((o) => o.name === opName);
    apply((tx) =>
      tx.setConnProps(conn.id, {
        name: v,
        operationRef: op && target ? { classId: target.cls.id, operationId: op.id } : null,
      }),
    );
    if (!op && target && opName && kind !== 'reply' && /^[\p{L}_][\p{L}\p{N}_]*$/u.test(opName)) {
      const ok = await confirmDialog({
        title: 'Thêm operation',
        text: `Thêm operation “${opName}()” vào class “${target.cls.name}”?`,
        confirmLabel: 'Thêm',
      });
      if (!ok) return;
      const nop = parseOperation(v.includes('(') ? `+ ${v}` : `+ ${v}()`);
      if (!nop) return;
      apply((tx) => {
        tx.setModelData(target.cls.id, { operations: [...target.ops, nop] });
        tx.setConnProps(conn.id, { operationRef: { classId: target.cls.id, operationId: nop.id } });
      });
    }
  };
  const field = (key: string, label: string, ph = '') => (
    <label className="grid gap-1">
      <span className="lbl">{label}</span>
      <input
        className="field"
        aria-label={label}
        placeholder={ph}
        defaultValue={str(p[key])}
        key={`${conn.id}:${key}:${str(p[key])}`}
        readOnly={readOnly}
        onBlur={(e) =>
          e.target.value !== str(p[key]) && apply((tx) => tx.setConnProps(conn.id, { [key]: e.target.value }))
        }
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
  return (
    <div className="pgroup grid gap-2">
      <label className="grid gap-1">
        <span className="lbl">{kind === 'reply' ? 'Giá trị trả về' : 'Tên message'}</span>
        <input
          id="seq-msg-name"
          className="field"
          aria-label="Tên message"
          list="seq-msg-ops"
          value={name}
          readOnly={readOnly}
          placeholder={target ? `operation của ${target.cls.name}…` : 'vd. kiemTra(maThe)'}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void commitName()}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {target && (
          <datalist id="seq-msg-ops">
            {target.ops.map((o) => (
              <option key={o.id} value={`${o.name}(${o.params.map((x) => x.name).join(', ')})`} />
            ))}
          </datalist>
        )}
      </label>
      {kind !== 'reply' && field('returnValue', 'Giá trị trả về', 'vd. ketQua')}
      {kind !== 'reply' && field('guard', 'Guard', 'vd. hopLe')}
      {field('number', 'Số thứ tự (ghi đè)', 'tự động')}
      {kind === 'duration' && field('duration', 'Độ trễ', 'vd. 2s')}
    </div>
  );
}

const both = (a: { view: { shape: string } }, b: { view: { shape: string } }) =>
  isLifeline(a.view) && isLifeline(b.view);

for (const d of DEFS) {
  registerConnector({
    kind: `seq.${d.kind}`,
    label: d.label,
    icon: d.icon,
    look: { line: d.line, start: d.start ?? 'none', end: d.end, stereotype: d.stereotype },
    defaultRouting: 'straight',
    defaultProps: () => ({
      name: d.kind === 'create' ? 'tao()' : '',
      arguments: '',
      returnValue: '',
      guard: '',
      number: '',
    }),
    labels,
    live: true,
    selfLoop: d.kind === 'self' || d.kind === 'recursive' || d.kind === 'sync' || d.kind === 'reentrant',
    freeEnds: d.kind === 'found' || d.kind === 'lost',
    timeline: true,
    route: (c, env) => route(c, env.lookup),
    bodyDrag: { preview: (c, dy) => previewMsgDrag(c, dy), commit: commitMsgDrag },
    onDoubleClick: () => requestAnimationFrame(() => document.getElementById('seq-msg-name')?.focus()),
    allow: (src, tgt) => {
      if (!both(src, tgt)) return 'Message chỉ nối giữa các lifeline';
      if ((d.kind === 'self' || d.kind === 'recursive') && src.view.id !== tgt.view.id)
        return `${d.label} phải quay về chính lifeline nguồn`;
      if (d.kind === 'create' && src.view.id === tgt.view.id) return 'Create Message phải tới lifeline khác';
      return true;
    },
    inspector: MessageInspector,
  });
}
