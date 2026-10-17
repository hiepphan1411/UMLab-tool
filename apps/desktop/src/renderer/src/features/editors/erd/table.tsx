// Hình dạng bảng ERD (docs/spec/notation-erd.md mục 1): Entity, View, Stored Procedure ResultSet.
// Đầu bảng màu (tên đậm, tên logic nhỏ phía trên, «view»/«result set»), ngăn cột khoá chính tách bằng đường kẻ,
// mỗi dòng `[icon] tên_cột   KIỂU(độ dài)   N/U`.
import { z } from 'zod';
import {
  ERD_KINDS,
  entityData,
  formatColumn,
  newColumn,
  parseColumn,
  typeText,
  viewData,
  type ErdColumn,
} from '@umlab/core';
import { registerShape, type RenderCtx, type ShapeDef, type TextRegion, type Tx } from '../engine/registry';
import { Label, fitText, textW } from '../engine/text';
import { strokeProps } from '../shapes/common/helpers';
import { setEntityColumns } from './ops';

type P = Record<string, unknown>;
export const FS = 12;
export const LH = 20;
const PAD = 6;
const NAME_FS = 13.5;
const SUB_FS = 10.5;

export type TableKind = 'entity' | 'view' | 'resultset';

const INFO: Record<
  TableKind,
  { shape: string; modelKind: string; label: string; icon: string; header: string; stereo: string }
> = {
  entity: {
    shape: 'erd.entity',
    modelKind: ERD_KINDS.entity,
    label: 'Entity',
    icon: 'entity',
    header: '#E7EEFD',
    stereo: '',
  },
  view: {
    shape: 'erd.view',
    modelKind: ERD_KINDS.view,
    label: 'View',
    icon: 'view',
    header: '#EEE8FA',
    stereo: 'view',
  },
  resultset: {
    shape: 'erd.resultset',
    modelKind: ERD_KINDS.resultset,
    label: 'Stored Procedure ResultSet',
    icon: 'resultset',
    header: '#E6F4EA',
    stereo: 'result set',
  },
};

const columnsOf = (ctx: Pick<RenderCtx, 'model'>, kind: TableKind): ErdColumn[] =>
  kind === 'entity' ? entityData(ctx.model).columns : viewData(ctx.model).columns;

const typeLabel = (c: ErdColumn) => (c.enumValues?.length ? (c.type === 'ENUM' ? 'ENUM' : c.type) : typeText(c));
const flagLabel = (c: ErdColumn) =>
  [c.nullable && !c.pk ? 'N' : '', c.unique && !c.pk ? 'U' : ''].filter(Boolean).join(' ');

/** Bố cục bảng: chiều cao đầu, các dòng (PK trước), vị trí cột kiểu / cờ, độ rộng cần thiết. */
export function tableLayout(ctx: RenderCtx, kind: TableKind) {
  const v = ctx.view;
  const p = ctx.props as P;
  const name = ctx.model?.name ?? INFO[kind].label;
  const d = kind === 'entity' ? entityData(ctx.model) : null;
  const logical = d?.logicalName ?? '';
  const st = INFO[kind].stereo ? `«${INFO[kind].stereo}»` : '';
  const sub = [st, logical].filter(Boolean).join(' ');
  const headerH = PAD * 2 + NAME_FS * 1.3 + (sub ? SUB_FS * 1.35 : 0);
  const cols = columnsOf(ctx, kind);
  const pks = cols.filter((c) => c.pk);
  const rest = cols.filter((c) => !c.pk);
  const indexed = new Set((d?.indexes ?? []).flatMap((ix) => ix.columns));
  const showTypes = p.showTypes !== false;
  const showFlags = p.showFlags !== false;
  const nameW = Math.max(40, ...cols.map((c) => textW(c.name, FS, c.pk ? 600 : 400)));
  const typeW = showTypes ? Math.max(0, ...cols.map((c) => textW(typeLabel(c), FS - 1, 400))) : 0;
  const flagW = showFlags ? Math.max(0, ...cols.map((c) => textW(flagLabel(c), FS - 1, 400))) : 0;
  const pkH = pks.length ? pks.length * LH + 4 : 0;
  const restH = Math.max(1, rest.length) * LH + 4;
  const totalH = headerH + pkH + (pks.length ? restH - (rest.length ? 0 : LH) : restH);
  const needW = Math.max(
    textW(name, NAME_FS, 700) + 28,
    sub ? textW(sub, SUB_FS, 400) + 24 : 0,
    24 + nameW + (showTypes ? 14 + typeW : 0) + (flagW ? 12 + flagW : 0) + 12,
    140,
  );
  return { v, name, sub, headerH, pks, rest, indexed, showTypes, showFlags, nameW, flagW, totalH, needW, cols };
}

function KeyIcon({ x, y, color, dot }: { x: number; y: number; color: string; dot?: string }) {
  return (
    <g>
      <circle cx={x - 2.5} cy={y} r={2.6} fill="none" stroke={color} strokeWidth={1.4} />
      <path
        d={`M${x},${y} h5.2 M${x + 3.6},${y} v2.2 M${x + 5.2},${y} v1.6`}
        stroke={color}
        strokeWidth={1.4}
        fill="none"
      />
      {dot && <circle cx={x + 5.5} cy={y - 3} r={1.9} fill={dot} />}
    </g>
  );
}

export function renderTable(ctx: RenderCtx, kind: TableKind) {
  const L = tableLayout(ctx, kind);
  const v = ctx.view;
  const p = ctx.props as P;
  const sp = strokeProps(ctx);
  const out = [
    <rect key="box" x={v.x} y={v.y} width={v.w} height={v.h} {...sp} rx={4} />,
    <path
      key="hd"
      d={`M${v.x},${v.y + L.headerH} V${v.y + 4} Q${v.x},${v.y} ${v.x + 4},${v.y} H${v.x + v.w - 4} Q${v.x + v.w},${v.y} ${v.x + v.w},${v.y + 4} V${v.y + L.headerH} Z`}
      fill={String(p.headerFill ?? '') || INFO[kind].header}
      stroke={sp.stroke}
      strokeWidth={sp.strokeWidth}
    />,
  ];
  let ty = v.y + PAD;
  if (L.sub) {
    out.push(
      <Label
        key="sub"
        x={v.x + v.w / 2}
        y={ty + SUB_FS * 0.65}
        text={fitText(L.sub, SUB_FS, 400, v.w - 10)}
        size={SUB_FS}
        color="#475569"
      />,
    );
    ty += SUB_FS * 1.35;
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
      />,
    );
  const typeX = v.x + 24 + L.nameW + 14;
  const row = (c: ErdColumn, y: number, i: string) => {
    const cy = y + LH / 2;
    const ix = v.x + 12;
    if (c.pk) out.push(<KeyIcon key={'k' + i} x={ix} y={cy} color="#D49B00" dot={c.fk ? '#4F79A8' : undefined} />);
    else if (c.fk) out.push(<KeyIcon key={'k' + i} x={ix} y={cy} color="#4F79A8" />);
    else
      out.push(
        <path
          key={'k' + i}
          d={`M${ix},${cy - 3.5} l3.5,3.5 l-3.5,3.5 l-3.5,-3.5 z`}
          fill="none"
          stroke="#94A3B8"
          strokeWidth={1.1}
        />,
      );
    if (L.indexed.has(c.id) || L.indexed.has(c.name))
      out.push(<circle key={'ix' + i} cx={ix + 7.5} cy={cy + 4} r={1.6} fill="#2E62E6" />);
    const maxName = L.showTypes ? L.nameW + 6 : v.w - 36;
    out.push(
      <Label
        key={'n' + i}
        x={v.x + 24}
        y={cy}
        text={fitText(c.name, FS, c.pk ? 600 : 400, maxName)}
        size={FS}
        weight={c.pk ? 600 : 400}
        anchor="start"
        underline={c.pk && !!p.underlinePk}
      />,
    );
    if (L.showTypes && typeX < v.x + v.w - 20)
      out.push(
        <Label
          key={'t' + i}
          x={typeX}
          y={cy}
          text={fitText(typeLabel(c), FS - 1, 400, v.x + v.w - typeX - 10 - (L.flagW ? 12 + L.flagW : 0))}
          size={FS - 1}
          color="#475569"
          anchor="start"
        />,
      );
    const fl = L.showFlags ? flagLabel(c) : '';
    if (fl)
      out.push(<Label key={'f' + i} x={v.x + v.w - 8} y={cy} text={fl} size={FS - 1} color="#64748B" anchor="end" />);
  };
  let y = v.y + L.headerH + 2;
  if (ctx.editing !== 'cols') {
    L.pks.forEach((c, i) => row(c, y + i * LH, 'p' + i));
    if (L.pks.length) {
      y += L.pks.length * LH + 2;
      out.push(<path key="pksep" d={`M${v.x},${y} H${v.x + v.w}`} stroke={sp.stroke} strokeWidth={sp.strokeWidth} />);
      y += 2;
    }
    L.rest.forEach((c, i) => row(c, y + i * LH, 'r' + i));
    if (!L.cols.length && !ctx.forExport)
      out.push(
        <Label
          key="empty"
          x={v.x + 24}
          y={y + LH / 2}
          text="Alt+Shift+C thêm cột"
          size={FS - 1}
          color="#94A3B8"
          anchor="start"
          italic
        />,
      );
  } else if (L.pks.length) {
    y += L.pks.length * LH + 2;
    out.push(
      <path
        key="pksep"
        d={`M${v.x},${y} H${v.x + v.w}`}
        stroke={sp.stroke}
        strokeWidth={sp.strokeWidth}
        opacity={0.3}
      />,
    );
  }
  return <>{out}</>;
}

/** Ghép dòng gõ với cột cũ: theo tên trước, rồi theo vị trí (dòng đổi tên) — giữ id / FK. */
export function linesToColumns(lines: string[], old: ErdColumn[]): ErdColumn[] {
  const used = new Set<string>();
  const names = lines.map(
    (l) =>
      l
        .trim()
        .split(/\s+/)[0]
        ?.replace(/^["`[]|["`\]]$/g, '')
        .toLowerCase() ?? '',
  );
  const out: ErdColumn[] = [];
  lines.forEach((line, i) => {
    let prev = old.find((c) => !used.has(c.id) && c.name.toLowerCase() === names[i]);
    if (!prev && old[i] && !used.has(old[i].id) && !names.includes(old[i].name.toLowerCase())) prev = old[i];
    const c = parseColumn(line, prev);
    if (!c || !c.name) return;
    if (prev) {
      used.add(prev.id);
      // giữ các trường không hiện trên dòng (tên logic, sửa tay…); trường hiện trên dòng lấy theo dòng mới
      const merged: ErdColumn = { ...prev, ...c };
      for (const k of ['length', 'precision', 'scale', 'default', 'check', 'comment', 'enumValues'] as const)
        if (c[k] === undefined) delete merged[k];
      out.push(merged);
    } else out.push(c);
  });
  return out;
}

export function tableRegions(ctx: RenderCtx, kind: TableKind): TextRegion[] {
  const L = tableLayout(ctx, kind);
  const v = ctx.view;
  const m = ctx.model;
  const regs: TextRegion[] = [
    {
      key: 'name',
      box: { x: v.x + 4, y: v.y + L.headerH - PAD - NAME_FS * 1.3 - 2, w: v.w - 8, h: NAME_FS * 1.3 + 4 },
      value: L.name,
      align: 'center',
      fontSize: NAME_FS,
      fontWeight: 700,
      commit: (tx, value) => {
        if (!m) return;
        const name = value.trim() || INFO[kind].label;
        if (name === m.name) return;
        tx.setModel(m.id, { name });
        const d = tx.model(m.id)?.data as { mappedFrom?: unknown } | undefined;
        if (kind === 'entity' && d?.mappedFrom) tx.setModelData(m.id, { manuallyEdited: true });
      },
    },
  ];
  const top = v.y + L.headerH + 2;
  regs.push({
    key: 'cols',
    box: { x: v.x + 2, y: top, w: v.w - 4, h: Math.max(LH, v.y + v.h - top - 2) },
    list: true,
    align: 'left',
    fontSize: FS,
    placeholder: 'ten_cot varchar(255) not null',
    value: [...L.pks, ...L.rest].map(formatColumn).join('\n'),
    commit: (tx, value) => {
      if (!m) return;
      const cur = tx.model(m.id);
      const old = columnsOf({ model: cur ?? null }, kind);
      const cols = linesToColumns(value.split('\n'), old);
      if (kind === 'entity') setEntityColumns(tx, m.id, cols);
      else tx.setModelData(m.id, { columns: cols });
    },
  });
  return regs;
}

const viewSchema = z.object({
  showTypes: z.boolean().describe('Hiện kiểu dữ liệu'),
  showFlags: z.boolean().describe('Hiện N (nullable) / U (unique)'),
  underlinePk: z.boolean().describe('Gạch chân cột khoá chính'),
  headerFill: z.string().describe('Màu đầu bảng|color'),
  autoSize: z.boolean().describe('Tự giãn theo nội dung'),
});

export function tableDef(kind: TableKind, extra: Partial<ShapeDef> = {}): ShapeDef {
  const info = INFO[kind];
  return {
    type: info.shape,
    label: info.label,
    icon: info.icon,
    modelKind: info.modelKind,
    defaultModel: () => ({
      name: kind === 'entity' ? 'bang_moi' : kind === 'view' ? 'v_moi' : 'ket_qua',
      data:
        kind === 'entity'
          ? { logicalName: '', schema: '', comment: '', columns: [], indexes: [], uniqueConstraints: [], checks: [] }
          : { definition: '', comment: '', columns: [] },
    }),
    defaultSize: { w: 200, h: 80 },
    minSize: { w: 100, h: 40 },
    defaultProps: () => ({ autoSize: true, showTypes: true, showFlags: true, underlinePk: false, headerFill: '' }),
    defaultStyle: { fill: '#FFFFFF', stroke: '#1F2937', strokeWidth: 1.2 },
    propsSchema: viewSchema,
    styleFields: ['fill', 'stroke', 'strokeWidth'],
    render: (ctx) => renderTable(ctx, kind),
    textRegions: (ctx) => tableRegions(ctx, kind),
    measure: (ctx) => {
      if ((ctx.props as P).autoSize === false) return null;
      const L = tableLayout(ctx, kind);
      return { w: Math.round(L.needW), h: Math.round(L.totalH + 2) };
    },
    shortcuts: {
      'Alt+Shift+C': (tx: Tx, v) => {
        if (!v.modelId) return;
        const m = tx.model(v.modelId);
        if (!m) return;
        const cols = columnsOf({ model: m }, kind);
        const names = new Set(cols.map((c) => c.name));
        let n = 'cot_moi';
        for (let i = 2; names.has(n); i++) n = `cot_moi_${i}`;
        const col = newColumn(n, 'VARCHAR', { length: 255 });
        if (kind === 'entity') setEntityColumns(tx, m.id, [...cols, col]);
        else tx.setModelData(m.id, { columns: [...cols, col] });
        return 'cols';
      },
    },
    ...extra,
  };
}

registerShape(
  tableDef('entity', {
    catalog: [
      { connector: 'erd.rel1n', shape: 'erd.entity', label: 'One-to-Many → Entity mới' },
      { connector: 'erd.rel11', shape: 'erd.entity', label: 'One-to-One → Entity mới' },
      { connector: 'erd.relnn', shape: 'erd.entity', label: 'Many-to-Many → Entity mới' },
      { connector: 'common.anchor', shape: 'common.note', label: 'Anchor → Note' },
    ],
  }),
);
registerShape(
  tableDef('view', { catalog: [{ connector: 'common.anchor', shape: 'common.note', label: 'Anchor → Note' }] }),
);
registerShape(tableDef('resultset'));

/** Kích thước tự giãn của một bảng (đặt bảng mới khi parse ORM / mẫu). */
export function entitySize(e: { name: string; columns: ErdColumn[]; logicalName?: string; indexes?: unknown[] }): {
  w: number;
  h: number;
} {
  const ctx = {
    view: {
      id: '',
      shape: 'erd.entity',
      modelId: null,
      x: 0,
      y: 0,
      w: 200,
      h: 80,
      z: 0,
      parentId: null,
      props: {},
      style: {},
    },
    props: {},
    model: { id: '', kind: ERD_KINDS.entity, name: e.name, data: { ...e } as Record<string, unknown> },
  } as unknown as RenderCtx;
  const L = tableLayout(ctx, 'entity');
  return { w: Math.round(L.needW), h: Math.round(L.totalH + 2) };
}
