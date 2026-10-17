// Xuất đặc tả ra DOCX đúng mẫu báo cáo khoá luận (docs/spec/usecase-spec-template.md mục 3):
// bảng 2 cột viền đen, cột trái tô xám nhạt, Times New Roman 13; luồng sự kiện là bảng con 3 cột.
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ITableCellOptions,
} from 'docx';
import type { Flow, Step, UseCaseSpec } from './model';
import { flowEndText, performerName, stepText, type SpecContext } from './render';

const FONT = 'Times New Roman';
const SIZE = 26; // nửa point → 13pt
const GRAY = 'D9D9D9';
const BLACK = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const BORDERS = {
  top: BLACK,
  bottom: BLACK,
  left: BLACK,
  right: BLACK,
  insideHorizontal: BLACK,
  insideVertical: BLACK,
};

/** data URL → bytes (Node 20 và trình duyệt đều có atob). */
function dataUrlBytes(src: string): { bytes: Uint8Array; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null {
  const m = src.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.*)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, type: m[1] === 'jpeg' ? 'jpg' : (m[1] as 'png' | 'jpg' | 'gif' | 'bmp') };
}

/** Ảnh đính kèm (rộng tối đa 420 px) + chú thích nghiêng. SVG bỏ qua. */
function imageParas(a: { src: string; w: number; h: number; name: string; caption?: string }): Paragraph[] {
  const img = dataUrlBytes(a.src);
  if (!img) return [];
  const k = Math.min(1, 420 / Math.max(1, a.w));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          type: img.type,
          data: img.bytes,
          transformation: { width: Math.round(a.w * k), height: Math.round(a.h * k) },
        }),
      ],
    }),
    para(a.caption || a.name, { italics: true, align: AlignmentType.CENTER }),
  ];
}

const run = (text: string, o: { bold?: boolean; italics?: boolean } = {}) =>
  new TextRun({ text, font: FONT, size: SIZE, bold: o.bold, italics: o.italics });

/** Đoạn văn (xuống dòng theo \n). */
function para(
  text: string,
  o: { bold?: boolean; italics?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {},
) {
  const lines = String(text ?? '').split('\n');
  return new Paragraph({
    alignment: o.align,
    spacing: { before: 40, after: 40 },
    children: lines.flatMap((l, i) =>
      i ? [new TextRun({ break: 1, text: '', font: FONT, size: SIZE }), run(l, o)] : [run(l, o)],
    ),
  });
}

function cell(children: (Paragraph | Table)[], o: Partial<ITableCellOptions> & { gray?: boolean } = {}) {
  const { gray, ...rest } = o;
  return new TableCell({
    children,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: gray ? { type: ShadingType.CLEAR, color: 'auto', fill: GRAY } : undefined,
    ...rest,
  });
}

function stepsTable(steps: Step[], ctx: SpecContext, prefix = ''): Table {
  const head = ['STT', 'Thực hiện bởi', 'Hành động'];
  const widths = [12, 26, 62];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    rows: [
      new TableRow({
        tableHeader: true,
        children: head.map((h, i) =>
          cell([para(h, { bold: true, align: AlignmentType.CENTER })], {
            gray: true,
            width: { size: widths[i], type: WidthType.PERCENTAGE },
          }),
        ),
      }),
      ...steps.map(
        (s) =>
          new TableRow({
            children: [
              cell([para(`${prefix}${s.no}`, { align: AlignmentType.CENTER })], {
                width: { size: widths[0], type: WidthType.PERCENTAGE },
              }),
              cell([para(performerName(s, ctx))], { width: { size: widths[1], type: WidthType.PERCENTAGE } }),
              cell([para(stepText(s, ctx))], { width: { size: widths[2], type: WidthType.PERCENTAGE } }),
            ],
          }),
      ),
    ],
  });
}

function flowsContent(flows: Flow[], ctx: SpecContext): (Paragraph | Table)[] {
  if (!flows.length) return [para('Không có')];
  const out: (Paragraph | Table)[] = [];
  for (const f of flows) {
    out.push(para(`${f.code} – ${f.name} (tại bước ${f.branchAt})`, { bold: true }));
    if (f.condition) out.push(para(`Điều kiện: ${f.condition}`, { italics: true }));
    out.push(stepsTable(f.steps, ctx, f.code + '.'));
    out.push(para(flowEndText(f), { italics: true }));
  }
  return out;
}

const numbered = (xs: string[]) => (xs.length ? xs.map((x, i) => para(`${i + 1}. ${x}`)) : [para('Không có')]);
const codedList = (xs: { code: string; text: string }[]) =>
  xs.length
    ? xs.map(
        (x) =>
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [run(`${x.code}: `, { bold: true }), run(x.text)],
          }),
      )
    : [para('Không có')];

/** Bảng đặc tả của một use case. */
export function specTable(spec: UseCaseSpec, ctx: SpecContext): Table {
  const actors = (ids: string[]) => ids.map(ctx.actorName).join(', ') || 'Không có';
  const rows: [string, (Paragraph | Table)[]][] = [
    ['Mã use case', [para(ctx.code)]],
    ['Tên use case', [para(ctx.name)]],
    ['Tác nhân chính', [para(actors(spec.primaryActors))]],
    ['Tác nhân phụ', [para(actors(spec.secondaryActors))]],
    ['Mô tả', [para(spec.description || 'Không có')]],
    ['Mức độ ưu tiên', [para(spec.priority)]],
    ['Sự kiện kích hoạt', [para(spec.trigger || 'Không có')]],
    ['Tiền điều kiện', numbered(spec.preconditions)],
    [
      'Hậu điều kiện',
      [
        para(`Thành công: ${spec.postconditions.success.join('; ') || 'Không có'}`),
        para(`Thất bại: ${spec.postconditions.failure.join('; ') || 'Không có'}`),
      ],
    ],
  ];
  if (spec.includes.length) rows.push(['Include', [para(spec.includes.map(ctx.useCaseLabel).join(', '))]]);
  if (spec.extends.length) rows.push(['Extend', [para(spec.extends.map(ctx.useCaseLabel).join(', '))]]);
  rows.push(
    ['Luồng sự kiện chính', [stepsTable(spec.mainFlow, ctx), para('')]],
    ['Luồng thay thế', flowsContent(spec.alternativeFlows, ctx)],
    ['Luồng ngoại lệ', flowsContent(spec.exceptionFlows, ctx)],
    ['Quy tắc nghiệp vụ', codedList(spec.businessRules)],
    ['Yêu cầu phi chức năng', codedList(spec.nonFunctional)],
  );
  if (spec.frequency) rows.push(['Tần suất', [para(spec.frequency)]]);
  if (spec.notes) rows.push(['Ghi chú', [para(spec.notes)]]);
  const imgs = (spec.images ?? []).flatMap((a) => imageParas(a));
  if (imgs.length) rows.push(['Ảnh màn hình', imgs]);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    rows: rows.map(
      ([k, v]) =>
        new TableRow({
          children: [
            cell([para(k, { bold: true })], { gray: true, width: { size: 26, type: WidthType.PERCENTAGE } }),
            cell(v, { width: { size: 74, type: WidthType.PERCENTAGE } }),
          ],
        }),
    ),
  });
}

/** Tài liệu DOCX cho một hoặc nhiều đặc tả; nhiều đặc tả → mỗi bảng có tiêu đề "Bảng x: Đặc tả use case UCxx". */
export function specsDocument(items: { spec: UseCaseSpec; ctx: SpecContext }[]): Document {
  const children: (Paragraph | Table)[] = [];
  items.forEach(({ spec, ctx }, i) => {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: i ? 360 : 0, after: 120 },
        children: [
          run(`Bảng ${i + 1}: Đặc tả use case ${ctx.code}${ctx.name ? ' – ' + ctx.name : ''}`, { bold: true }),
        ],
      }),
    );
    children.push(specTable(spec, ctx));
  });
  return new Document({
    creator: 'UMLab',
    title: items.length === 1 ? `Đặc tả ${items[0].ctx.code}` : 'Đặc tả use case',
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } }, children }],
  });
}

/** Bytes của tệp .docx (chạy được cả renderer lẫn Node). */
export async function specsDocx(items: { spec: UseCaseSpec; ctx: SpecContext }[]): Promise<Uint8Array> {
  return new Uint8Array(await Packer.toArrayBuffer(specsDocument(items)));
}
