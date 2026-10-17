// Mẫu "Class UniPark+" khi tạo Class Diagram mới.
import { parseAttribute, parseOperation, uid, type Connector, type ModelElement, type View } from '@umlab/core';
import type { DiagramInit } from '../editor-registry';
import { newEnd, type AssocEnd } from './connectors';

export function unipkClassTemplate(): DiagramInit {
  const views: View[] = [];
  const model: ModelElement[] = [];
  const connectors: Connector[] = [];
  let z = 0;
  const cls = (
    name: string,
    x: number,
    y: number,
    attrs: string[],
    ops: string[] = [],
    o: { kind?: 'class' | 'enumeration'; abstract?: boolean; stereotypes?: string[]; literals?: string[] } = {},
  ) => {
    const enumKind = o.kind === 'enumeration';
    const m: ModelElement = {
      id: uid('m'),
      kind: enumKind ? 'uml.enumeration' : 'uml.class',
      name,
      data: {
        stereotypes: o.stereotypes ?? (enumKind ? [] : ['entity']),
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
    model.push(m);
    const rows = enumKind ? (o.literals ?? []).length : attrs.length;
    const h = Math.round(
      6 * 2 +
        13.5 * 1.3 +
        11.5 * 1.35 +
        (6 + Math.max(1, rows) * 18 + 2) +
        (enumKind ? 0 : 6 + Math.max(1, ops.length) * 18 + 2),
    );
    const id = uid('v');
    views.push({
      id,
      shape: enumKind ? 'cls.enum' : 'cls.class',
      modelId: m.id,
      x,
      y,
      w: 240,
      h,
      z: z++,
      parentId: null,
      props: { autoSize: true },
      style: {},
    });
    return { id, m };
  };
  const link = (
    kind: string,
    a: { id: string; m: ModelElement },
    b: { id: string; m: ModelElement },
    ends?: [Partial<AssocEnd>, Partial<AssocEnd>],
    name = '',
  ) => {
    let modelId: string | null = null;
    if (ends) {
      const agg = kind === 'cls.composition' ? 'composite' : kind === 'cls.aggregation' ? 'shared' : 'none';
      const am: ModelElement = {
        id: uid('m'),
        kind: 'uml.association',
        name,
        data: {
          showDirection: false,
          ends: [
            { ...newEnd(a.m.id, agg), ...ends[0] },
            { ...newEnd(b.m.id), ...ends[1] },
          ],
        },
      };
      model.push(am);
      modelId = am.id;
    }
    connectors.push({
      id: uid('c'),
      kind,
      modelId,
      source: { viewId: a.id },
      target: { viewId: b.id },
      routing: 'orthogonal',
      waypoints: [],
      labels: [],
      props: {},
      style: {},
      z: z++,
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
  const loai = cls('LoaiXe', 1090, 560, [], [], { kind: 'enumeration', literals: ['XE_MAY', 'O_TO', 'XE_DAP'] });
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
  void loai;
  return { views, connectors, model };
}
