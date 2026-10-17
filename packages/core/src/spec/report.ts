// "Mẫu Doc" — đặc tả theo mẫu bảng báo cáo hai cột (Mục | Mô tả; luồng chia cột Actor | System, bước rẽ đánh
// số kiểu 3a, 3a.1…). Một mô hình hàng dùng chung cho DOCX, HTML (dán vào Word) và văn bản thuần.
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  LineRuleType,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { Flow, Step, UseCaseSpec } from './model';
import { stepText, type SpecContext } from './render';

export type ReportRow =
  | { kind: 'header' }
  | { kind: 'field'; label: string; lines: string[] }
  | { kind: 'section'; text: string }
  | { kind: 'columns' }
  | { kind: 'step'; side: 'actor' | 'system'; text: string }
  | { kind: 'note'; text: string };

const side = (s: Step): 'actor' | 'system' => (s.performer.kind === 'system' ? 'system' : 'actor');
const bullets = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`) : ['Không có']);

/** Nhãn bước rẽ theo mẫu: bước 3 → 3a, 3b… (đếm chung luồng thay thế rồi ngoại lệ). */
export function flowLabels(spec: UseCaseSpec): Map<string, string> {
  const used = new Map<number, number>();
  const out = new Map<string, string>();
  for (const f of [...spec.alternativeFlows, ...spec.exceptionFlows]) {
    const n = used.get(f.branchAt) ?? 0;
    used.set(f.branchAt, n + 1);
    out.set(f.id, `${f.branchAt}${String.fromCharCode(97 + (n % 26))}`);
  }
  return out;
}

function flowEnd(f: Flow): string {
  if (f.end.kind === 'returnTo')
    return f.end.stepNo > f.branchAt ? `Tiếp tục bước ${f.end.stepNo}` : `Quay lại bước ${f.end.stepNo}`;
  return f.end.kind === 'endSuccess' ? 'Kết thúc use case' : 'Kết thúc use case (thất bại)';
}

function flowRows(flows: Flow[], labels: Map<string, string>, ctx: SpecContext): ReportRow[] {
  if (!flows.length) return [{ kind: 'note', text: 'Không có' }];
  return flows.flatMap((f): ReportRow[] => {
    const l = labels.get(f.id)!;
    return [
      { kind: 'step', side: 'actor', text: `${l}. ${f.condition.trim() || f.name.trim() || f.code}` },
      ...f.steps.map((s, i): ReportRow => ({
        kind: 'step',
        side: side(s),
        text: `${l}.${i + 1}. ${stepText(s, ctx)}`,
      })),
      { kind: 'step', side: 'system', text: `${l}.${f.steps.length + 1}. ${flowEnd(f)}` },
    ];
  });
}

export function specReportRows(spec: UseCaseSpec, ctx: SpecContext): ReportRow[] {
  const names = (ids: string[]) => ids.map(ctx.actorName).join(', ') || 'Không có';
  const post = [
    ...spec.postconditions.success.map((x) => `- ${x}`),
    ...spec.postconditions.failure.map((x) => `- Nếu thất bại: ${x}`),
  ];
  const labels = flowLabels(spec);
  return [
    { kind: 'header' },
    { kind: 'field', label: 'Tên use case', lines: [ctx.name || ctx.code] },
    { kind: 'field', label: 'Actor chính', lines: [names(spec.primaryActors)] },
    { kind: 'field', label: 'Actor phụ', lines: [names(spec.secondaryActors)] },
    { kind: 'field', label: 'Mô tả sơ lược', lines: (spec.description || 'Không có').split('\n') },
    { kind: 'field', label: 'Pre-condition (Tiền điều kiện)', lines: bullets(spec.preconditions) },
    { kind: 'field', label: 'Post-condition (Hậu điều kiện)', lines: post.length ? post : ['Không có'] },
    { kind: 'section', text: 'Basic flow:' },
    { kind: 'columns' },
    ...spec.mainFlow.map((s): ReportRow => ({ kind: 'step', side: side(s), text: `${s.no}. ${stepText(s, ctx)}` })),
    { kind: 'section', text: 'Alternate Flows (Luồng sự kiện thay thế):' },
    ...flowRows(spec.alternativeFlows, labels, ctx),
    { kind: 'section', text: 'Exception flow (Luồng sự kiện ngoại lệ):' },
    ...flowRows(spec.exceptionFlows, labels, ctx),
  ];
}

// ---------------- DOCX ----------------

const FONT = 'Times New Roman';
const SIZE = 26; // 13pt
const COLS = [4380, 4342]; // twip, như mẫu (tổng 8722)
const B = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const BORDERS = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };

const p = (text: string, o: { bold?: boolean; center?: boolean } = {}) =>
  new Paragraph({
    alignment: o.center ? AlignmentType.CENTER : undefined,
    spacing: { after: 0, line: 360, lineRule: LineRuleType.AUTO },
    children: [new TextRun({ text, bold: o.bold, font: FONT, size: SIZE })],
  });

function td(lines: string[], o: { bold?: boolean; center?: boolean; span?: number } = {}) {
  const span = o.span ?? 1;
  return new TableCell({
    width: { size: span === 2 ? COLS[0] + COLS[1] : COLS[0], type: WidthType.DXA },
    columnSpan: span > 1 ? span : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: { top: B, bottom: B, left: B, right: B },
    children: (lines.length ? lines : ['']).map((l) => p(l, o)),
  });
}

function rowOf(r: ReportRow): TableRow {
  const tr = (cells: TableCell[], h = 390) =>
    new TableRow({ cantSplit: true, height: { value: h, rule: HeightRule.ATLEAST }, children: cells });
  switch (r.kind) {
    case 'header':
      return tr([td(['Mục'], { bold: true }), td(['Mô tả'], { bold: true })]);
    case 'field':
      return tr([td([r.label], { bold: true }), td(r.lines)]);
    case 'section':
      return tr([td([r.text], { bold: true, span: 2 })], 97);
    case 'columns':
      return tr([td(['Actor'], { bold: true, center: true }), td(['System'], { bold: true, center: true })], 97);
    case 'note':
      return tr([td([r.text], { span: 2 })], 97);
    case 'step':
      return tr(r.side === 'actor' ? [td([r.text]), td([])] : [td([]), td([r.text])], 97);
  }
}

export function specReportTable(spec: UseCaseSpec, ctx: SpecContext): Table {
  return new Table({
    width: { size: COLS[0] + COLS[1], type: WidthType.DXA },
    columnWidths: COLS,
    layout: TableLayoutType.FIXED,
    borders: BORDERS,
    rows: specReportRows(spec, ctx).map(rowOf),
  });
}

/** .docx theo mẫu; nhiều đặc tả → các bảng nối tiếp, cách nhau một dòng trống. */
export async function specReportDocx(items: { spec: UseCaseSpec; ctx: SpecContext }[]): Promise<Uint8Array> {
  const children: (Paragraph | Table)[] = [];
  items.forEach(({ spec, ctx }, i) => {
    if (i) children.push(p(''));
    children.push(specReportTable(spec, ctx));
  });
  children.push(p(''));
  const doc = new Document({
    creator: 'UMLab',
    title: items.length === 1 ? `Đặc tả ${items[0].ctx.code}` : 'Đặc tả use case',
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children,
      },
    ],
  });
  return new Uint8Array(await Packer.toArrayBuffer(doc));
}

// ---------------- HTML (clipboard → Word) & văn bản ----------------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Bảng HTML với style nội tuyến — dán vào Word giữ viền đen, Times New Roman 13pt, giãn dòng 1,5. */
export function specReportHtml(spec: UseCaseSpec, ctx: SpecContext): string {
  const font = `font-family:'Times New Roman',serif;font-size:13pt;line-height:150%;color:#000`;
  const cell = `border:0.75pt solid #000;padding:3pt 5pt;vertical-align:top;${font}`;
  const ps = (lines: string[], bold = false, center = false) =>
    (lines.length ? lines : [''])
      .map(
        (l) =>
          `<p style="margin:0;${font}${center ? ';text-align:center' : ''}">${bold ? '<b>' : ''}${esc(l) || '&nbsp;'}${bold ? '</b>' : ''}</p>`,
      )
      .join('');
  const tdh = (inner: string, span = 1, w = COLS[0]) =>
    `<td${span > 1 ? ` colspan="${span}"` : ''} style="${cell};width:${Math.round(span > 1 ? 436 : w / 20)}pt">${inner}</td>`;
  const rows = specReportRows(spec, ctx).map((r) => {
    switch (r.kind) {
      case 'header':
        return tdh(ps(['Mục'], true)) + tdh(ps(['Mô tả'], true), 1, COLS[1]);
      case 'field':
        return tdh(ps([r.label], true)) + tdh(ps(r.lines), 1, COLS[1]);
      case 'section':
        return tdh(ps([r.text], true), 2);
      case 'columns':
        return tdh(ps(['Actor'], true, true)) + tdh(ps(['System'], true, true), 1, COLS[1]);
      case 'note':
        return tdh(ps([r.text]), 2);
      case 'step':
        return r.side === 'actor'
          ? tdh(ps([r.text])) + tdh(ps([]), 1, COLS[1])
          : tdh(ps([])) + tdh(ps([r.text]), 1, COLS[1]);
    }
  });
  return (
    `<table style="border-collapse:collapse;width:436pt;table-layout:fixed;${font}" border="1" cellspacing="0" cellpadding="0">` +
    `<colgroup><col style="width:219pt"><col style="width:217pt"></colgroup>` +
    rows.map((r) => `<tr>${r}</tr>`).join('') +
    `</table>`
  );
}

/** Văn bản thuần (tab ngăn cột) — cho nơi dán không nhận HTML. */
export function specReportText(spec: UseCaseSpec, ctx: SpecContext): string {
  return specReportRows(spec, ctx)
    .map((r) => {
      switch (r.kind) {
        case 'header':
          return 'Mục\tMô tả';
        case 'field':
          return `${r.label}\t${r.lines.join('\n\t')}`;
        case 'section':
        case 'note':
          return r.text;
        case 'columns':
          return 'Actor\tSystem';
        case 'step':
          return r.side === 'actor' ? r.text : `\t${r.text}`;
      }
    })
    .join('\n');
}
