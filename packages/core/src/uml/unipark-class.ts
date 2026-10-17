// Mô hình Class Diagram UniPark+ (User, SinhVien ⟶ User, Xe, TheRFID, PhienGuiXe, GoiThang, ViDienTu, GiaoDich,
// ReputationEvent, enum LoaiXe). Dùng cho mẫu "Class UniPark+" và fixture test parse ORM (orm-mapping.md mục 5).
import type { ModelElement } from '../format/types';
import { uid } from '../util/ids';
import { parseAttribute, parseOperation } from './parse-member';

export interface UnipkClass {
  model: ModelElement;
  x: number;
  y: number;
  kind: 'class' | 'enumeration';
  rows: number;
  ops: number;
}

export interface UnipkLink {
  kind: 'cls.generalization' | 'cls.association' | 'cls.composition' | 'cls.aggregation';
  from: string;
  to: string;
  /** Phần tử `uml.association` (null với generalization). */
  model: ModelElement | null;
}

type End = Partial<{
  role: string;
  multiplicity: string;
  navigable: 'yes' | 'no' | 'unspecified';
  isOrdered: boolean;
}>;

const end = (classId: string, aggregation: 'none' | 'shared' | 'composite', o: End = {}) => ({
  classId,
  role: '',
  multiplicity: '',
  navigable: 'unspecified',
  aggregation,
  visibility: '',
  isOrdered: false,
  isUnique: false,
  ...o,
});

export function unipkClassModel(): { classes: UnipkClass[]; links: UnipkLink[] } {
  const classes: UnipkClass[] = [];
  const links: UnipkLink[] = [];
  const cls = (
    name: string,
    x: number,
    y: number,
    attrs: string[],
    ops: string[] = [],
    o: { kind?: 'class' | 'enumeration'; abstract?: boolean; literals?: string[] } = {},
  ) => {
    const enumKind = o.kind === 'enumeration';
    const m: ModelElement = {
      id: uid('m'),
      kind: enumKind ? 'uml.enumeration' : 'uml.class',
      name,
      data: {
        stereotypes: enumKind ? [] : ['entity'],
        visibility: '+',
        isAbstract: !!o.abstract,
        isLeaf: false,
        isActive: false,
        templateParams: [],
        attributes: attrs.map((a) => parseAttribute(a)!),
        operations: ops.map((a) => parseOperation(a)!),
        literals: (o.literals ?? []).map((l) => ({ id: uid('l'), name: l })),
        documentation: '',
      },
    };
    classes.push({
      model: m,
      x,
      y,
      kind: enumKind ? 'enumeration' : 'class',
      rows: enumKind ? (o.literals ?? []).length : attrs.length,
      ops: ops.length,
    });
    return m.id;
  };
  const link = (kind: UnipkLink['kind'], from: string, to: string, ends?: [End, End], name = '') => {
    if (!ends) {
      links.push({ kind, from, to, model: null });
      return;
    }
    const agg = kind === 'cls.composition' ? 'composite' : kind === 'cls.aggregation' ? 'shared' : 'none';
    links.push({
      kind,
      from,
      to,
      model: {
        id: uid('m'),
        kind: 'uml.association',
        name,
        data: { showDirection: false, ends: [end(from, agg, ends[0]), end(to, 'none', ends[1])] },
      },
    });
  };

  const user = cls(
    'User',
    380,
    30,
    ['- id : UUID {id}', '- hoTen : String', '- email : String {unique}', '- matKhauHash : String'],
    ['+ dangNhap(email : String, matKhau : String) : boolean'],
    { abstract: true },
  );
  const sv = cls(
    'SinhVien',
    380,
    300,
    ['- mssv : String {unique}', '- diemUyTin : int = 100'],
    ['+ coTheGuiXe() : boolean'],
  );
  const the = cls('TheRFID', 30, 300, ['- maThe : String {unique}', '- trangThai : String', '- ngayCap : Date']);
  const vi = cls(
    'ViDienTu',
    740,
    300,
    ['- soDu : Decimal = 0'],
    ['+ nap(soTien : Decimal) : void', '+ tru(soTien : Decimal) : boolean'],
  );
  const gd = cls('GiaoDich', 1090, 300, [
    '- id : UUID {id}',
    '- soTien : Decimal',
    '- loai : String',
    '- thoiGian : DateTime',
  ]);
  const xe = cls('Xe', 30, 560, ['- bienSo : String [1] {unique}', '- loaiXe : LoaiXe', '- mauXe : String']);
  const goi = cls(
    'GoiThang',
    380,
    560,
    ['- id : UUID {id}', '- tuNgay : Date', '- denNgay : Date', '- gia : Decimal'],
    ['+ conHieuLuc() : boolean'],
  );
  const rep = cls('ReputationEvent', 740, 560, [
    '- id : UUID {id}',
    '- diem : int',
    '- lyDo : String',
    '- thoiGian : DateTime',
  ]);
  cls('LoaiXe', 1090, 560, [], [], { kind: 'enumeration', literals: ['XE_MAY', 'O_TO', 'XE_DAP'] });
  const phien = cls(
    'PhienGuiXe',
    30,
    820,
    ['- id : UUID {id}', '- gioVao : DateTime', '- gioRa : DateTime [0..1]', '- phi : Decimal'],
    ['+ tinhPhi() : Decimal'],
  );

  link('cls.generalization', sv, user);
  link('cls.association', sv, xe, [
    { multiplicity: '1', role: 'chuXe' },
    { multiplicity: '0..*', role: 'xe' },
  ]);
  link('cls.association', sv, the, [{ multiplicity: '1' }, { multiplicity: '0..1', role: 'the' }]);
  link('cls.composition', sv, vi, [{ multiplicity: '1' }, { multiplicity: '1', role: 'vi' }]);
  link('cls.composition', vi, gd, [{ multiplicity: '1' }, { multiplicity: '0..*', role: 'giaoDich', isOrdered: true }]);
  link('cls.association', sv, goi, [{ multiplicity: '1' }, { multiplicity: '0..*', role: 'goiThang' }]);
  link('cls.composition', sv, rep, [{ multiplicity: '1' }, { multiplicity: '0..*', role: 'lichSuUyTin' }]);
  link('cls.association', phien, xe, [{ multiplicity: '0..*' }, { multiplicity: '1', navigable: 'yes' }]);
  link('cls.association', phien, the, [{ multiplicity: '0..*' }, { multiplicity: '1', navigable: 'yes' }]);
  return { classes, links };
}
