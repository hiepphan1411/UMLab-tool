// Sơ đồ tư duy "VSTEP B1": sinh tự động từ tài liệu (nhánh = kỹ năng, nhánh con = phần, lá = mục).
import { PLAN_PHASES, normMindmap, type MindmapData } from '@umlab/core';
import { DOCS } from './index';
import type { DocId } from './types';

const COLORS: Record<DocId | 'plan' | 'exam', string> = {
  exam: '#2E62E6',
  listening: '#0E8A9B',
  reading: '#1F9D66',
  writing: '#D98A1C',
  speaking: '#C2417E',
  grammar: '#7C5CC4',
  vocab: '#4A6FA5',
  plan: '#D9463E',
};

/** Khái niệm ngắn cho node: câu đầu tiên của mục (bỏ cú pháp). */
function summaryOf(body: string): string {
  const text = body
    .replace(/^~~~[\s\S]*?^~~~/gm, ' ')
    .replace(/^\|.*$/gm, ' ')
    .replace(/\{\{([^{}|]+)\|[^{}]*\}\}/g, '$1')
    .replace(/[*_#>`[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const s = text.split(/(?<=[.!?:])\s/)[0] ?? '';
  return s.length > 90 ? s.slice(0, 87) + '…' : s;
}

/** Đổi cú pháp riêng sang Markdown thường (để xem trong trình mindmap của UMLab khi xuất tệp). */
export function toPlainMarkdown(body: string): string {
  return body
    .replace(/^~~~([a-z]+)[ \t]*(.*)\n([\s\S]*?)^~~~[ \t]*$/gm, (_m, type: string, title: string, inner: string) => {
      const lines = inner.replace(/\n$/, '').split('\n');
      const head = title ? `**${title}**\n\n` : '';
      switch (type) {
        case 'vocab':
          return (
            head +
            '| Từ | Phiên âm | Loại | Nghĩa | Ví dụ |\n|---|---|---|---|---|\n' +
            lines
              .map((l) => {
                const c = l.split('|').map((x) => x.trim());
                return `| **${c[0] ?? ''}** | ${c[1] ?? ''} | ${c[2] ?? ''} | ${c[3] ?? ''} | ${c[4] ?? ''} |`;
              })
              .join('\n')
          );
        case 'say':
          return (
            head +
            lines
              .filter(Boolean)
              .map((l) => {
                const [en, ...vi] = l.split(' | ');
                return `- **${en.trim()}** — ${vi.join(' | ').trim()}`;
              })
              .join('\n')
          );
        case 'template':
          return head + '```\n' + inner.replace(/\*\*/g, '') + '```';
        case 'sample':
        case 'dialog':
          return (
            head +
            inner
              .split(/^---[ \t]*$/m)[0]
              .split('\n')
              .map((l) => '> ' + l)
              .join('\n')
          );
        case 'tip':
        case 'warn':
        case 'note':
          return '```' + type + (title ? ' ' + title : '') + '\n' + inner + '```';
        default:
          return '```\n' + inner + '```';
      }
    })
    .replace(/\{\{([^{}|]+)\|([^{}|]*)(?:\|([^{}]*))?\}\}/g, (_m, w: string, b: string, c?: string) =>
      c !== undefined ? `**${w}** ${b} (${c})` : `**${w}** (${b})`,
    )
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
}

interface RawNode {
  id: string;
  parentId: string | null;
  order: number;
  kind: string;
  title: string;
  summary: string;
  detail: string;
  color: string | null;
  collapsed: boolean;
}

/** Nội dung gốc (cú pháp riêng) theo id node — để xem bằng Rich trong app. */
export const MIND_DETAIL = new Map<string, string>();

function build(): MindmapData {
  const nodes: RawNode[] = [];
  const add = (n: Omit<RawNode, 'order' | 'collapsed'> & { collapsed?: boolean }, raw?: string) => {
    const order = nodes.filter((x) => x.parentId === n.parentId).length;
    nodes.push({ ...n, order, collapsed: n.collapsed ?? false });
    if (raw) MIND_DETAIL.set(n.id, raw);
  };
  const rootDetail = `Mục tiêu: **điểm trung bình 4 kỹ năng ≥ 4,0** (B1), cố gắng 5,0 để có dư.

| Kỹ năng | Đề thi | Mục tiêu |
|---|---|---|
| Nghe | 3 phần, 35 câu, ~40 phút | 16/35 câu (≈4,5) |
| Đọc | 4 bài, 40 câu, 60 phút | 18/40 câu (≈4,5) |
| Viết | Thư 120 từ + luận 250 từ, 60 phút | 5,0 nhờ template |
| Nói | 3 phần, ~12 phút | 5,0 nhờ template |
`;
  add(
    {
      id: 'root',
      parentId: null,
      kind: 'root',
      title: 'VSTEP B1 — lộ trình đậu',
      summary: 'Nghe, Đọc, Viết, Nói ≥ 4,0 trung bình',
      detail: rootDetail,
      color: null,
    },
    rootDetail,
  );

  const order: DocId[] = ['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocab'];
  for (const id of order) {
    const d = DOCS[id];
    const bid = `b-${id}`;
    add({
      id: bid,
      parentId: 'root',
      kind: 'branch',
      title: d.title,
      summary: d.subtitle,
      detail: '',
      color: COLORS[id],
    });
    for (const p of d.parts) {
      const pid = `${bid}-${p.id}`;
      add({
        id: pid,
        parentId: bid,
        kind: 'topic',
        title: p.title.replace(/^Phần \d+\.\s*/, ''),
        summary: `${p.sections.length} mục`,
        detail: '',
        color: null,
        collapsed: id === 'vocab' || id === 'grammar',
      });
      for (const s of p.sections)
        add(
          {
            id: `${pid}-${s.id}`,
            parentId: pid,
            kind: 'topic',
            title: s.title.replace(/^\d+\.\d+\.\s*/, ''),
            summary: summaryOf(s.body),
            detail: toPlainMarkdown(s.body),
            color: null,
          },
          s.body,
        );
    }
  }
  const planDetail = PLAN_PHASES.map(
    (p) => `- **Giai đoạn ${p.id} — ${p.name}** (${Math.round(p.share * 100)}% số ngày): ${p.goal}.`,
  ).join('\n');
  add(
    {
      id: 'b-plan',
      parentId: 'root',
      kind: 'branch',
      title: 'Lịch học 4 giai đoạn',
      summary: 'Tự chia từ hôm nay tới ngày thi',
      detail: planDetail,
      color: COLORS.plan,
    },
    planDetail,
  );
  for (const p of PLAN_PHASES)
    add({
      id: `plan-${p.id}`,
      parentId: 'b-plan',
      kind: 'topic',
      title: `GĐ ${p.id}: ${p.name}`,
      summary: p.goal,
      detail: '',
      color: null,
    });

  return normMindmap(
    { title: 'VSTEP B1 — lộ trình đậu', layout: 'both', locked: true, references: [], nodes },
    'VSTEP B1',
  );
}

export const VSTEP_MINDMAP = build();
