// Kiểm tra Sequence Diagram (docs/spec/notation-sequence.md mục 4).
import type { Issue, Rule } from '../engine/registry';
import { isLifeline, msgKind, operandsOf, seqResult } from './state';

export const SEQUENCE_RULES: Rule[] = [
  // reply lạc / message sau Destroy
  (r) => {
    const res = seqResult(r.lookup);
    return res.issues.map((i): Issue =>
      i.kind === 'unmatchedReply'
        ? { level: 'warning', message: 'Reply không khớp message gọi (sync) nào', targetId: i.msgId }
        : { level: 'error', message: 'Message tới / từ lifeline đã bị huỷ (sau dấu ✕)', targetId: i.msgId },
    );
  },
  // fragment: alt 1 operand, operand thiếu guard
  (r) => {
    const out: Issue[] = [];
    for (const f of r.views.filter((v) => v.shape === 'seq.fragment')) {
      const op = String(f.props.operator ?? 'alt');
      const ops = operandsOf(f.props);
      if (op === 'alt' && ops.length === 1)
        out.push({
          level: 'info',
          message: 'Fragment alt chỉ có 1 operand — nên dùng opt',
          targetId: f.id,
          fix: { label: 'Đổi thành opt', run: (tx) => tx.setViewProps(f.id, { operator: 'opt' }) },
        });
      if (op === 'alt' || op === 'opt' || op === 'loop' || op === 'break')
        ops.forEach((o, i) => {
          const elseOk = i === ops.length - 1 && i > 0;
          if (!o.guard.trim() && !elseOk && op !== 'loop')
            out.push({ level: 'warning', message: `Operand ${i + 1} của ${op} thiếu guard`, targetId: f.id });
        });
    }
    return out;
  },
  // lifeline không có message
  (r) => {
    const used = new Set<string>();
    for (const c of r.conns)
      if (msgKind(c.kind)) {
        if (c.source.viewId) used.add(c.source.viewId);
        if (c.target.viewId) used.add(c.target.viewId);
      }
    return r.views
      .filter((v) => isLifeline(v) && !used.has(v.id))
      .map((v) => ({
        level: 'info' as const,
        message: `Lifeline “${(v.modelId && r.lookup.model(v.modelId)?.name) || 'lifeline'}” không có message nào`,
        targetId: v.id,
      }));
  },
];
