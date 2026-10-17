// Parser / formatter thành viên class (docs/spec/notation-class.md mục 1):
//   thuộc tính: `vis [/]name : Type [mult] = default {constraints}`  ($ trước tên = static, / = derived)
//   phương thức: `vis name(dir p : T = d, …) : Return {query, abstract}`
import { uid } from '../util/ids';

export type Visibility = '+' | '-' | '#' | '~';

export interface Attribute {
  id: string;
  name: string;
  type: string;
  visibility: Visibility;
  multiplicity: string;
  default: string | null;
  isStatic: boolean;
  isDerived: boolean;
  isReadOnly: boolean;
  constraints: string[];
  stereotypes: string[];
}

export interface Param {
  name: string;
  type: string;
  direction: 'in' | 'out' | 'inout' | 'return';
  default?: string;
}

export interface Operation {
  id: string;
  name: string;
  visibility: Visibility;
  params: Param[];
  returnType: string;
  isStatic: boolean;
  isAbstract: boolean;
  isQuery: boolean;
  stereotypes: string[];
}

export type ParsedMember = { kind: 'attribute'; attr: Attribute } | { kind: 'operation'; op: Operation };

const VIS = new Set(['+', '-', '#', '~']);
const MULT = /^\s*(\d+|\*|n)(\s*\.\.\s*(\d+|\*|n))?\s*$/i;

/** Tách theo dấu phẩy ở cấp ngoài cùng (bỏ qua phẩy trong <>, (), [], {}, chuỗi). */
export function splitTop(s: string, sep = ','): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    if ('<([{'.includes(ch)) depth++;
    if ('>)]}'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter((x, i, a) => x || a.length > 1);
}

function takeStereotypes(s: string): { rest: string; stereotypes: string[] } {
  const stereotypes: string[] = [];
  let rest = s.trim();
  for (;;) {
    const m = rest.match(/^(?:«([^»]*)»|<<([^>]*)>>)\s*/);
    if (!m) break;
    stereotypes.push(
      ...(m[1] ?? m[2])
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    );
    rest = rest.slice(m[0].length);
  }
  return { rest, stereotypes };
}

/** {a, b} ở cuối chuỗi. */
function takeConstraints(s: string): { rest: string; constraints: string[] } {
  const m = s.match(/\{([^{}]*)\}\s*$/);
  if (!m) return { rest: s.trim(), constraints: [] };
  return {
    rest: s.slice(0, m.index).trim(),
    constraints: m[1]
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  };
}

/** Tìm vị trí ký tự `ch` ở cấp ngoài cùng (không nằm trong <>, (), [], chuỗi). */
function indexTop(s: string, ch: string, from = 0): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if ('<([{'.includes(c)) depth++;
    else if ('>)]}'.includes(c)) depth = Math.max(0, depth - 1);
    else if (c === ch && depth === 0) return i;
  }
  return -1;
}

/** Tách "Type [mult]" — ngoặc vuông cuối là multiplicity nếu đúng dạng, ngược lại thuộc kiểu (byte[]). */
function splitTypeMult(s: string): { type: string; multiplicity: string } {
  const m = s.match(/\[([^\]]*)\]\s*$/);
  if (m && MULT.test(m[1])) return { type: s.slice(0, m.index).trim(), multiplicity: m[1].replace(/\s+/g, '') };
  return { type: s.trim(), multiplicity: '' };
}

function parseParam(raw: string): Param {
  let s = raw.trim();
  let direction: Param['direction'] = 'in';
  const dm = s.match(/^(in|out|inout|return)\s+/i);
  if (dm) {
    direction = dm[1].toLowerCase() as Param['direction'];
    s = s.slice(dm[0].length);
  }
  let def: string | undefined;
  const eq = indexTop(s, '=');
  if (eq >= 0) {
    def = s.slice(eq + 1).trim();
    s = s.slice(0, eq).trim();
  }
  const colon = indexTop(s, ':');
  const name = (colon >= 0 ? s.slice(0, colon) : s).trim();
  const type = colon >= 0 ? s.slice(colon + 1).trim() : '';
  const p: Param = { name, type, direction };
  if (def !== undefined && def !== '') p.default = def;
  return p;
}

/**
 * Phân tích một dòng thành viên. `prev` (tuỳ chọn) giữ id và cờ không gõ được bằng chữ khi sửa lại dòng cũ.
 * Trả về null nếu dòng rỗng.
 */
export function parseMember(
  text: string,
  prev?: Partial<Attribute & Operation>,
  defaults: { attrVis?: Visibility; opVis?: Visibility } = {},
): ParsedMember | null {
  const st = takeStereotypes(text);
  let s = st.rest;
  if (!s) return null;
  let vis: Visibility | null = null;
  if (VIS.has(s[0])) {
    vis = s[0] as Visibility;
    s = s.slice(1).trim();
  }
  let isStatic = false;
  let isDerived = false;
  for (let i = 0; i < 2; i++) {
    if (s.startsWith('$')) {
      isStatic = true;
      s = s.slice(1).trim();
    }
    if (s.startsWith('/')) {
      isDerived = true;
      s = s.slice(1).trim();
    }
  }
  const paren = s.indexOf('(');
  const colon = indexTop(s, ':');
  if (paren >= 0 && (colon < 0 || paren < colon)) {
    // ---------- phương thức ----------
    const close = s.lastIndexOf(')');
    const name = s.slice(0, paren).trim();
    const inner = close > paren ? s.slice(paren + 1, close) : s.slice(paren + 1);
    let tail = close > paren ? s.slice(close + 1).trim() : '';
    const c = takeConstraints(tail);
    tail = c.rest;
    let returnType = '';
    if (tail.startsWith(':')) returnType = tail.slice(1).trim();
    const params = inner.trim() ? splitTop(inner).filter(Boolean).map(parseParam) : [];
    const cons = new Set(c.constraints.map((x) => x.toLowerCase()));
    return {
      kind: 'operation',
      op: {
        id: prev?.id ?? uid('o'),
        name,
        visibility: vis ?? defaults.opVis ?? '+',
        params,
        returnType,
        isStatic: isStatic || cons.has('static'),
        isAbstract: cons.has('abstract') || (!!prev?.isAbstract && !c.constraints.length),
        isQuery: cons.has('query'),
        stereotypes: st.stereotypes,
      },
    };
  }
  // ---------- thuộc tính ----------
  const c = takeConstraints(s);
  s = c.rest;
  let def: string | null = null;
  const eq = indexTop(s, '=');
  if (eq >= 0) {
    def = s.slice(eq + 1).trim();
    s = s.slice(0, eq).trim();
  }
  const col = indexTop(s, ':');
  let name = (col >= 0 ? s.slice(0, col) : s).trim();
  let tm = col >= 0 ? splitTypeMult(s.slice(col + 1)) : { type: '', multiplicity: '' };
  if (col < 0) {
    // "ten[0..*]" không có kiểu
    const m = splitTypeMult(name);
    if (m.multiplicity) {
      name = m.type;
      tm = { type: '', multiplicity: m.multiplicity };
    }
  }
  const cons = c.constraints.filter((x) => !/^(static|readonly|readOnly)$/i.test(x));
  return {
    kind: 'attribute',
    attr: {
      id: prev?.id ?? uid('a'),
      name,
      type: tm.type,
      visibility: vis ?? defaults.attrVis ?? '-',
      multiplicity: tm.multiplicity,
      default: def === '' ? null : def,
      isStatic: isStatic || c.constraints.some((x) => /^static$/i.test(x)),
      isDerived,
      isReadOnly: c.constraints.some((x) => /^readonly$/i.test(x)),
      constraints: cons,
      stereotypes: st.stereotypes,
    },
  };
}

export function parseAttribute(text: string, prev?: Partial<Attribute>): Attribute | null {
  const r = parseMember(text, prev);
  if (!r) return null;
  if (r.kind === 'attribute') return r.attr;
  // gõ nhầm dạng phương thức trong ngăn thuộc tính: lấy tên làm thuộc tính
  return { ...emptyAttribute(r.op.name), id: prev?.id ?? r.op.id, visibility: r.op.visibility, type: r.op.returnType };
}

export function parseOperation(text: string, prev?: Partial<Operation>): Operation | null {
  const t = text.trim();
  if (!t) return null;
  const r = parseMember(t.includes('(') ? t : t.replace(/(\s*:|$)/, '()$1'), prev);
  return r?.kind === 'operation' ? r.op : null;
}

export function emptyAttribute(name = 'thuocTinh'): Attribute {
  return {
    id: uid('a'),
    name,
    type: '',
    visibility: '-',
    multiplicity: '',
    default: null,
    isStatic: false,
    isDerived: false,
    isReadOnly: false,
    constraints: [],
    stereotypes: [],
  };
}

export function emptyOperation(name = 'phuongThuc'): Operation {
  return {
    id: uid('o'),
    name,
    visibility: '+',
    params: [],
    returnType: '',
    isStatic: false,
    isAbstract: false,
    isQuery: false,
    stereotypes: [],
  };
}

const stereo = (s: string[]) => (s.length ? `«${s.join(', ')}» ` : '');

export interface FormatOpts {
  hideType?: boolean;
  hideParams?: boolean;
  hideVisibility?: boolean;
}

/** Hiển thị thuộc tính theo chuẩn: `- bienSo : String [1] {unique}`. ($ static thể hiện bằng gạch chân khi vẽ.) */
export function formatAttribute(a: Attribute, o: FormatOpts = {}): string {
  let s = stereo(a.stereotypes);
  if (!o.hideVisibility) s += a.visibility + ' ';
  if (a.isDerived) s += '/';
  s += a.name;
  if (a.type && !o.hideType) s += ' : ' + a.type;
  if (a.multiplicity) s += ` [${a.multiplicity}]`;
  if (a.default !== null && a.default !== undefined && a.default !== '') s += ' = ' + a.default;
  const cons = [...a.constraints, ...(a.isReadOnly ? ['readOnly'] : [])];
  if (cons.length) s += ` {${cons.join(', ')}}`;
  return s;
}

/** Dạng chuỗi để sửa lại (giữ $ cho static). */
export function editAttribute(a: Attribute): string {
  const f = formatAttribute(a);
  if (!a.isStatic) return f;
  return f.replace(/^(«[^»]*»\s*)?([+\-#~]\s)?/, (m) => m + '$');
}

export function formatParam(p: Param, hideType = false): string {
  let s = p.direction !== 'in' ? p.direction + ' ' : '';
  s += p.name;
  if (p.type && !hideType) s += ' : ' + p.type;
  if (p.default) s += ' = ' + p.default;
  return s;
}

export function formatOperation(op: Operation, o: FormatOpts = {}): string {
  let s = stereo(op.stereotypes);
  if (!o.hideVisibility) s += op.visibility + ' ';
  s +=
    op.name +
    '(' +
    (o.hideParams ? (op.params.length ? '…' : '') : op.params.map((p) => formatParam(p, o.hideType)).join(', ')) +
    ')';
  if (op.returnType && !o.hideType) s += ' : ' + op.returnType;
  const cons = [...(op.isQuery ? ['query'] : [])];
  if (cons.length) s += ` {${cons.join(', ')}}`;
  return s;
}

export function editOperation(op: Operation): string {
  let s = formatOperation(op);
  if (op.isAbstract) s += ' {abstract}';
  if (op.isStatic) s = s.replace(/^(«[^»]*»\s*)?([+\-#~]\s)?/, (m) => m + '$');
  return s.replace('} {', ', ');
}
