// Classifier 3 ngăn (Class, Interface, Enumeration, Data Type, Primitive, Signal) — docs/spec/notation-class.md mục 1.
// Ngăn tên: «stereotype», tên đậm (nghiêng nếu abstract); ngăn thuộc tính / phương thức (gạch chân nếu static,
// nghiêng nếu abstract); enumeration có ngăn literals. Template: ô nét đứt góc trên phải. Active: viền kép hai bên.
import { z } from 'zod';
import {
  editAttribute,
  editOperation,
  emptyAttribute,
  emptyOperation,
  formatAttribute,
  formatOperation,
  parseAttribute,
  parseOperation,
  uid,
  type Attribute,
  type Operation,
} from '@umlab/core';
import { registerShape, type RenderCtx, type ShapeDef, type TextRegion, type Tx } from '../engine/registry';
import { Label, fitText, textW } from '../engine/text';
import { strokeProps } from '../shapes/common/helpers';
import { CLASSIFIER, classData, classifierNames, suggestTypes, unknownTypes, type ClassifierKind } from './model';

type P = Record<string, unknown>;
export const FS = 12.5;
export const LH = 18;
const PAD = 6;
const NAME_FS = 13.5;
const ST_FS = 11.5;

export interface ClassLine {
  text: string;
  italic?: boolean;
  underline?: boolean;
  bad?: boolean;
}
export interface ClassSection {
  key: 'attrs' | 'ops' | 'literals';
  lines: ClassLine[];
  y: number;
  h: number;
}

function stereotypeOf(kind: ClassifierKind, st: string[]): string {
  const all = [CLASSIFIER[kind].stereotype, ...st].filter(Boolean);
  return all.length ? `«${all.join(', ')}»` : '';
}

/** Bố cục classifier: chiều cao ngăn tên, các ngăn còn lại, độ rộng cần thiết. */
export function classLayout(ctx: RenderCtx, kind: ClassifierKind) {
  const v = ctx.view;
  const p = ctx.props as P;
  const d = classData(ctx.model);
  const name = ctx.model?.name ?? CLASSIFIER[kind].label;
  const st = stereotypeOf(kind, d.stereotypes);
  const headerH = PAD * 2 + NAME_FS * 1.3 + (st ? ST_FS * 1.35 : 0);
  const known = new Set(classifierNames(ctx.lookup));
  const tps = d.templateParams.map((t) => t.name);
  const fmt = { hideType: !!p.hideTypes, hideParams: !!p.hideParams };
  const pub = (x: { visibility: string }) => !p.publicOnly || x.visibility === '+';
  const sections: ClassSection[] = [];
  let y = v.y + headerH;
  const push = (key: ClassSection['key'], lines: ClassLine[]) => {
    const h = PAD + Math.max(1, lines.length) * LH + (lines.length ? PAD - 4 : 0);
    sections.push({ key, lines, y, h });
    y += h;
  };
  if (kind === 'enumeration') {
    if (p.showLiterals !== false)
      push(
        'literals',
        d.literals.map((l) => ({ text: l.name })),
      );
    if (p.showOperations === true || d.operations.length)
      if (p.showOperations !== false)
        push(
          'ops',
          d.operations
            .filter(pub)
            .map((o) => ({ text: formatOperation(o, fmt), italic: o.isAbstract, underline: o.isStatic })),
        );
  } else if (kind !== 'primitive') {
    if (p.showAttributes !== false)
      push(
        'attrs',
        d.attributes.filter(pub).map((a) => ({
          text: formatAttribute(a, fmt),
          underline: a.isStatic,
          bad: !ctx.forExport && unknownTypes(a.type, known, tps).length > 0,
        })),
      );
    if (p.showOperations !== false && kind !== 'datatype' && kind !== 'signal')
      push(
        'ops',
        d.operations.filter(pub).map((o) => ({
          text: formatOperation(o, fmt),
          italic: o.isAbstract,
          underline: o.isStatic,
          bad:
            !ctx.forExport &&
            [o.returnType, ...o.params.map((x) => x.type)].some((t) => unknownTypes(t, known, tps).length > 0),
        })),
      );
    else if ((kind === 'datatype' || kind === 'signal') && d.operations.length && p.showOperations !== false)
      push(
        'ops',
        d.operations.filter(pub).map((o) => ({ text: formatOperation(o, fmt) })),
      );
  }
  const textWs = sections.flatMap((s) => s.lines.map((l) => textW(l.text, FS, 400, l.italic)));
  const needW = Math.max(
    textW(name, NAME_FS, 700, d.isAbstract) + 24,
    st ? textW(st, ST_FS, 400) + 20 : 0,
    ...textWs.map((w) => w + PAD * 2 + 6),
    100,
  );
  return { name, st, headerH, sections, totalH: y - v.y, needW, d, kind };
}

/** Gạch lượn sóng dưới chữ (kiểu không tồn tại). */
function wavy(x: number, y: number, w: number) {
  let d = `M${x},${y}`;
  for (let i = 0; x + i * 3 < x + w; i++) d += ` l1.5,${i % 2 ? 1.6 : -1.6} l1.5,${i % 2 ? -1.6 : 1.6}`;
  return d;
}

export function renderClassifier(ctx: RenderCtx, kind: ClassifierKind) {
  const v = ctx.view;
  const p = ctx.props as P;
  const sp = strokeProps(ctx);
  if (kind === 'interface' && p.display === 'lollipop') {
    const r = Math.min(12, v.w / 2 - 2);
    return (
      <>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} fill="transparent" />
        <circle
          cx={v.x + v.w / 2}
          cy={v.y + r + 1}
          r={r}
          fill={ctx.style.fill}
          stroke={ctx.style.stroke}
          strokeWidth={ctx.style.strokeWidth}
        />
        {ctx.editing !== 'name' && (
          <Label
            x={v.x + v.w / 2}
            y={v.y + r * 2 + 12}
            text={ctx.model?.name ?? 'Interface'}
            size={12.5}
            weight={600}
          />
        )}
      </>
    );
  }
  const L = classLayout(ctx, kind);
  const out = [
    <rect key="box" x={v.x} y={v.y} width={v.w} height={v.h} {...sp} />,
    <rect
      key="hd"
      x={v.x}
      y={v.y}
      width={v.w}
      height={L.headerH}
      fill={String(p.headerFill ?? '') || ctx.style.fill}
      stroke={sp.stroke}
      strokeWidth={sp.strokeWidth}
    />,
  ];
  if (L.d.isActive)
    out.push(
      <path
        key="act"
        d={`M${v.x + 5},${v.y} V${v.y + v.h} M${v.x + v.w - 5},${v.y} V${v.y + v.h}`}
        stroke={sp.stroke}
        strokeWidth={sp.strokeWidth}
      />,
    );
  let ty = v.y + PAD;
  if (L.st) {
    out.push(<Label key="st" x={v.x + v.w / 2} y={ty + ST_FS * 0.65} text={L.st} size={ST_FS} color="#334155" />);
    ty += ST_FS * 1.35;
  }
  if (ctx.editing !== 'name')
    out.push(
      <Label
        key="nm"
        x={v.x + v.w / 2}
        y={ty + NAME_FS * 0.65}
        text={fitText(L.name, NAME_FS, 700, v.w - 12)}
        size={NAME_FS}
        weight={700}
        italic={L.d.isAbstract}
      />,
    );
  for (const s of L.sections) {
    out.push(
      <path key={'sep' + s.key} d={`M${v.x},${s.y} H${v.x + v.w}`} stroke={sp.stroke} strokeWidth={sp.strokeWidth} />,
    );
    if (ctx.editing === s.key) continue;
    s.lines.forEach((l, i) => {
      const y = s.y + PAD + i * LH + LH / 2;
      const text = fitText(l.text, FS, 400, v.w - PAD * 2 - 4);
      out.push(
        <Label
          key={s.key + i}
          x={v.x + PAD + 2}
          y={y}
          text={text}
          size={FS}
          italic={l.italic}
          underline={l.underline}
          anchor="start"
        />,
      );
      if (l.bad)
        out.push(
          <path
            key={s.key + 'w' + i}
            d={wavy(v.x + PAD + 2, y + 7, Math.min(textW(text, FS, 400, l.italic), v.w - PAD * 2))}
            stroke="#D9463E"
            strokeWidth={0.9}
            fill="none"
          >
            <title>Kiểu không tồn tại trong project</title>
          </path>,
        );
    });
  }
  // template: ô nét đứt đè góc trên phải
  if (L.d.templateParams.length) {
    const t = L.d.templateParams.map((x) => (x.type ? `${x.name} : ${x.type}` : x.name)).join(', ');
    const tw = textW(t, 11, 400) + 12;
    out.push(
      <g key="tpl">
        <rect
          x={v.x + v.w - tw * 0.7}
          y={v.y - 10}
          width={tw}
          height={18}
          fill="#FFFFFF"
          stroke={sp.stroke}
          strokeWidth={1}
          strokeDasharray="3 2"
        />
        <Label x={v.x + v.w - tw * 0.7 + tw / 2} y={v.y - 1} text={t} size={11} />
      </g>,
    );
  }
  return <>{out}</>;
}

/** Vùng sửa chữ: tên + từng ngăn (danh sách, có gợi ý kiểu khi gõ ":"). */
export function classifierRegions(ctx: RenderCtx, kind: ClassifierKind): TextRegion[] {
  const v = ctx.view;
  const p = ctx.props as P;
  if (kind === 'interface' && p.display === 'lollipop')
    return [
      {
        key: 'name',
        box: { x: v.x - 40, y: v.y + v.h - 20, w: v.w + 80, h: 22 },
        value: ctx.model?.name ?? '',
        align: 'center',
        fontSize: 12.5,
        fontWeight: 600,
        commit: (tx, value) => ctx.model && tx.setModel(ctx.model.id, { name: value.trim() || 'Interface' }),
      },
    ];
  const L = classLayout(ctx, kind);
  const m = ctx.model;
  const regs: TextRegion[] = [
    {
      key: 'name',
      box: { x: v.x + 4, y: v.y + L.headerH - PAD - NAME_FS * 1.3 - 2, w: v.w - 8, h: NAME_FS * 1.3 + 4 },
      value: L.name,
      align: 'center',
      fontSize: NAME_FS,
      fontWeight: 700,
      commit: (tx, value) => m && tx.setModel(m.id, { name: value.trim() || CLASSIFIER[kind].label }),
    },
  ];
  const suggest = (line: string) => suggestTypes(ctx.lookup, line);
  for (const s of L.sections) {
    const box = { x: v.x + 2, y: s.y + 2, w: v.w - 4, h: Math.max(LH, s.h - 4) };
    if (s.key === 'attrs')
      regs.push({
        key: 'attrs',
        box,
        list: true,
        align: 'left',
        fontSize: FS,
        placeholder: '- ten : String',
        value: L.d.attributes.map(editAttribute).join('\n'),
        suggest,
        commit: (tx, value) => {
          if (!m) return;
          const old = classData(tx.model(m.id)).attributes;
          const attrs = value
            .split('\n')
            .map((line, i) => parseAttribute(line, old[i]))
            .filter((a): a is Attribute => !!a && !!a.name);
          tx.setModelData(m.id, { attributes: attrs });
        },
      });
    if (s.key === 'ops')
      regs.push({
        key: 'ops',
        box,
        list: true,
        align: 'left',
        fontSize: FS,
        placeholder: '+ ten() : void',
        value: L.d.operations.map(editOperation).join('\n'),
        suggest,
        commit: (tx, value) => {
          if (!m) return;
          const old = classData(tx.model(m.id)).operations;
          const ops = value
            .split('\n')
            .map((line, i) => parseOperation(line, old[i]))
            .filter((o): o is Operation => !!o && !!o.name);
          tx.setModelData(m.id, { operations: ops });
        },
      });
    if (s.key === 'literals')
      regs.push({
        key: 'literals',
        box,
        list: true,
        align: 'left',
        fontSize: FS,
        placeholder: 'GIA_TRI',
        value: L.d.literals.map((l) => l.name).join('\n'),
        commit: (tx, value) => {
          if (!m) return;
          const old = classData(tx.model(m.id)).literals;
          const lits = value
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean)
            .map((name, i) => ({ id: old[i]?.id ?? uid('l'), name }));
          tx.setModelData(m.id, { literals: lits });
        },
      });
  }
  return regs;
}

const viewSchema = (kind: ClassifierKind) =>
  z.object({
    ...(kind === 'interface'
      ? { display: z.enum(['box', 'lollipop']).describe('Hiển thị|opts:box=Hình chữ nhật;lollipop=Lollipop') }
      : {}),
    ...(kind === 'enumeration' ? { showLiterals: z.boolean().describe('Hiện literals') } : {}),
    ...(kind !== 'enumeration' && kind !== 'primitive'
      ? { showAttributes: z.boolean().describe('Hiện thuộc tính') }
      : {}),
    ...(kind !== 'primitive' ? { showOperations: z.boolean().describe('Hiện phương thức') } : {}),
    hideTypes: z.boolean().describe('Ẩn kiểu dữ liệu'),
    hideParams: z.boolean().describe('Ẩn tham số'),
    publicOnly: z.boolean().describe('Chỉ hiện public'),
    autoSize: z.boolean().describe('Tự giãn theo nội dung'),
  });

export const classModelSchema = z.object({
  stereotypes: z.array(z.string().describe('Stereotype')).describe('Stereotype (entity, controller…)'),
  visibility: z.enum(['+', '-', '#', '~']).describe('Visibility|opts:+=public;-=private;#=protected;~=package'),
  isAbstract: z.boolean().describe('Abstract'),
  isLeaf: z.boolean().describe('Leaf (không cho kế thừa)'),
  isActive: z.boolean().describe('Active class'),
  templateParams: z
    .array(z.object({ name: z.string().describe('Tham số'), type: z.string().describe('Kiểu') }))
    .describe('Tham số template'),
  documentation: z.string().describe('Tài liệu|textarea'),
});

export function classifierDef(kind: ClassifierKind, extra: Partial<ShapeDef> = {}): ShapeDef {
  const info = CLASSIFIER[kind];
  const size =
    kind === 'primitive' ? { w: 140, h: 40 } : kind === 'enumeration' ? { w: 160, h: 90 } : { w: 180, h: 90 };
  return {
    type: info.shape,
    label: info.label,
    icon: info.icon,
    modelKind: info.modelKind,
    defaultModel: () => ({
      name: kind === 'class' ? 'Class' : kind === 'interface' ? 'IInterface' : info.label.replace(/\s/g, ''),
      data: { ...emptyClassDataPlain() },
    }),
    defaultSize: size,
    minSize: { w: 60, h: 28 },
    defaultProps: () => ({ autoSize: true, hideTypes: false, hideParams: false, publicOnly: false }),
    defaultStyle: { fill: '#FFFFFF', stroke: '#1F2937', strokeWidth: 1.3 },
    propsSchema: viewSchema(kind),
    modelSchema:
      kind === 'primitive' ? classModelSchema.pick({ stereotypes: true, documentation: true }) : classModelSchema,
    styleFields: ['fill', 'stroke', 'strokeWidth'],
    render: (ctx) => renderClassifier(ctx, kind),
    textRegions: (ctx) => classifierRegions(ctx, kind),
    measure: (ctx) => {
      if ((ctx.props as P).autoSize === false) return null;
      if (kind === 'interface' && (ctx.props as P).display === 'lollipop') return { w: 60, h: 50 };
      const L = classLayout(ctx, kind);
      return { w: Math.max(Math.round(L.needW), kind === 'primitive' ? 100 : 120), h: Math.round(L.totalH) };
    },
    shortcuts:
      kind === 'primitive'
        ? undefined
        : {
            'Alt+Shift+A': (tx: Tx, v) => {
              if (!v.modelId) return;
              const m = tx.model(v.modelId);
              if (!m) return;
              if (kind === 'enumeration') {
                tx.setModelData(m.id, { literals: [...classData(m).literals, { id: uid('l'), name: 'GIA_TRI' }] });
                tx.setViewProps(v.id, { showLiterals: true });
                return 'literals';
              }
              tx.setModelData(m.id, { attributes: [...classData(m).attributes, emptyAttribute()] });
              tx.setViewProps(v.id, { showAttributes: true });
              return 'attrs';
            },
            'Alt+Shift+O': (tx: Tx, v) => {
              if (!v.modelId) return;
              const m = tx.model(v.modelId);
              if (!m) return;
              tx.setModelData(m.id, { operations: [...classData(m).operations, emptyOperation()] });
              tx.setViewProps(v.id, { showOperations: true });
              return 'ops';
            },
          },
    catalog: [
      { connector: 'cls.association', shape: 'cls.class', label: 'Association → Class' },
      { connector: 'cls.composition', shape: 'cls.class', label: 'Composition → Class' },
      { connector: 'cls.generalization', shape: info.shape, label: `Generalization → ${info.label}` },
      ...(kind === 'class'
        ? [{ connector: 'cls.realization', shape: 'cls.interface', label: 'Realization → Interface' }]
        : []),
      { connector: 'cls.dependency', shape: 'cls.class', label: 'Dependency → Class' },
      { connector: 'common.anchor', shape: 'common.note', label: 'Anchor → Note' },
    ],
    ...extra,
  };
}

function emptyClassDataPlain(): Record<string, unknown> {
  return {
    stereotypes: [],
    visibility: '+',
    isAbstract: false,
    isLeaf: false,
    isActive: false,
    templateParams: [],
    attributes: [],
    operations: [],
    literals: [],
    documentation: '',
  };
}

for (const k of Object.keys(CLASSIFIER) as ClassifierKind[]) registerShape(classifierDef(k));
