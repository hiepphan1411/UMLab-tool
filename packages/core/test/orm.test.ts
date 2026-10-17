import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  classToErd,
  createDiagram,
  defaultOrmSelection,
  defaultSelection,
  diffErd,
  erdSchemaFromDiagram,
  erdState,
  erdToDdl,
  modelMap,
  ormInputFromDiagram,
  parseAttribute,
  planSync,
  plural,
  snakeCase,
  uid,
  unipkClassModel,
  validateErd,
  viewsMap,
  writeErdPlan,
  type Connector,
  type ErdEntity,
  type ModelElement,
  type OrmInput,
  type OrmResult,
  type View,
} from '../src';

/** Class Diagram UniPark+ trong một Y.Doc (như mẫu "Class UniPark+"). */
function unipkDoc() {
  const doc = new Y.Doc();
  const { classes, links } = unipkClassModel();
  const views: View[] = [];
  const connectors: Connector[] = [];
  const model: ModelElement[] = [];
  const viewOf = new Map<string, string>();
  for (const c of classes) {
    model.push(c.model);
    const id = uid('v');
    viewOf.set(c.model.id, id);
    views.push({
      id,
      shape: c.kind === 'enumeration' ? 'cls.enum' : 'cls.class',
      modelId: c.model.id,
      x: c.x,
      y: c.y,
      w: 240,
      h: 120,
      z: 0,
      parentId: null,
      props: {},
      style: {},
    });
  }
  for (const l of links) {
    if (l.model) model.push(l.model);
    connectors.push({
      id: uid('c'),
      kind: l.kind,
      modelId: l.model?.id ?? null,
      source: { viewId: viewOf.get(l.from)! },
      target: { viewId: viewOf.get(l.to)! },
      routing: 'orthogonal',
      waypoints: [],
      labels: [],
      props: {},
      style: {},
    });
  }
  const classDiagram = createDiagram(doc, 'class', 'Class', null, undefined, { views, connectors, model });
  const byName = (n: string) => [...modelMap(doc).values()].find((m) => m.name === n)!;
  return { doc, classDiagram, byName };
}

const table = (r: OrmResult, name: string) => r.entities.find((e) => e.name === name)!;
const col = (e: ErdEntity, name: string) => e.columns.find((c) => c.name === name)!;
const fkTarget = (r: OrmResult, e: ErdEntity, c: string) =>
  r.entities.find((x) => x.id === col(e, c).fk?.refEntityId)?.name;

describe('ORM: đọc Class Diagram', () => {
  it('class, association, generalization (đường nối giữa 2 hình)', () => {
    const { doc, classDiagram } = unipkDoc();
    const input = ormInputFromDiagram(doc, classDiagram);
    expect(input.classes).toHaveLength(10);
    expect(input.associations).toHaveLength(8);
    expect(input.generalizations).toHaveLength(1);
    expect(defaultOrmSelection(input)).toHaveLength(9); // có «entity» → chỉ class gắn «entity» (không có enum)
  });
});

describe('ORM: classToErd với fixture UniPark+', () => {
  const { doc, classDiagram } = unipkDoc();
  const input = ormInputFromDiagram(doc, classDiagram);

  it('JOINED (mặc định): 9 bảng, 9 FK, không bảng trung gian', () => {
    const r = classToErd(input);
    expect(r.entities.map((e) => e.name).sort()).toEqual(
      [
        'giao_dich',
        'goi_thang',
        'phien_gui_xe',
        'reputation_event',
        'sinh_vien',
        'the_rfid',
        'user',
        'vi_dien_tu',
        'xe',
      ].sort(),
    );
    expect(r.report).toMatchObject({ tables: 9, foreignKeys: 9, junctionTables: 0, warnings: [] });
    expect(r.relationships).toHaveLength(9);
    // JOINED: bảng con có PK = FK tới cha, cùng tên & kiểu
    const sv = table(r, 'sinh_vien');
    expect(col(sv, 'id')).toMatchObject({ pk: true, type: 'UUID', autoIncrement: false });
    expect(fkTarget(r, sv, 'id')).toBe('user');
    expect(r.relationships.find((x) => x.mappedFrom?.key.startsWith('gen:'))).toMatchObject({
      kind: 'rel11',
      identifying: true,
      onDelete: 'CASCADE',
    });
    expect(sv.columns.map((c) => c.name)).toEqual(['id', 'mssv', 'diem_uy_tin']);
    expect(col(sv, 'diem_uy_tin')).toMatchObject({ type: 'INTEGER', default: '100', nullable: false });
  });

  it('thuộc tính → cột: PK {id}, thêm id khi thiếu, [0..1] NULL, {unique}, enum, default', () => {
    const r = classToErd(input);
    const xe = table(r, 'xe');
    expect(col(xe, 'id')).toMatchObject({ type: 'BIGINT', pk: true, autoIncrement: true });
    expect(col(xe, 'bien_so')).toMatchObject({ type: 'VARCHAR', length: 255, unique: true, nullable: false });
    expect(col(xe, 'loai_xe')).toMatchObject({ type: 'loai_xe', enumValues: ['XE_MAY', 'O_TO', 'XE_DAP'] });
    const phien = table(r, 'phien_gui_xe');
    expect(col(phien, 'gio_ra')).toMatchObject({ type: 'TIMESTAMPTZ', nullable: true });
    expect(col(phien, 'gio_vao').nullable).toBe(false);
    expect(col(table(r, 'vi_dien_tu'), 'so_du')).toMatchObject({
      type: 'NUMERIC',
      precision: 19,
      scale: 4,
      default: '0',
    });
    expect(table(r, 'user').columns.map((c) => c.name)).toEqual(['id', 'ho_ten', 'email', 'mat_khau_hash']);
    // phương thức bỏ qua
    expect(r.entities.flatMap((e) => e.columns).some((c) => /tinh_phi|dang_nhap/.test(c.name))).toBe(false);
  });

  it('association: 1–* FK ở phía *, role → <role>_id, 1–0..1 UNIQUE, composition CASCADE', () => {
    const r = classToErd(input);
    const xe = table(r, 'xe');
    expect(col(xe, 'chu_xe_id')).toMatchObject({ type: 'UUID', nullable: false, unique: false });
    expect(fkTarget(r, xe, 'chu_xe_id')).toBe('sinh_vien');
    const the = table(r, 'the_rfid');
    expect(col(the, 'sinh_vien_id')).toMatchObject({ unique: true, nullable: false });
    const vi = table(r, 'vi_dien_tu');
    expect(col(vi, 'sinh_vien_id').unique).toBe(true);
    const relVi = r.relationships.find((x) => x.child.entityId === vi.id)!;
    expect(relVi).toMatchObject({ kind: 'rel11', onDelete: 'CASCADE' });
    const gd = table(r, 'giao_dich');
    expect(fkTarget(r, gd, 'vi_dien_tu_id')).toBe('vi_dien_tu');
    expect(r.relationships.find((x) => x.child.entityId === gd.id)).toMatchObject({
      kind: 'rel1n',
      onDelete: 'CASCADE',
      child: { cardinality: 'zeroOrMany' },
    });
    const phien = table(r, 'phien_gui_xe');
    expect(col(phien, 'xe_id')).toMatchObject({ type: 'BIGINT', nullable: false });
    expect(col(phien, 'the_rfid_id').type).toBe('BIGINT');
  });

  it('SINGLE_TABLE: gộp lớp con vào bảng cha + dtype; TABLE_PER_CLASS: bỏ bảng abstract, bảng con đủ cột', () => {
    const st = classToErd(input, { inheritance: 'SINGLE_TABLE' });
    expect(st.report.tables).toBe(8);
    const user = table(st, 'user');
    expect(col(user, 'mssv')).toMatchObject({ nullable: true, unique: true });
    expect(col(user, 'dtype')).toMatchObject({ type: 'VARCHAR', length: 31, nullable: false });
    expect(fkTarget(st, table(st, 'xe'), 'chu_xe_id')).toBe('user');
    const tpc = classToErd(input, { inheritance: 'TABLE_PER_CLASS' });
    expect(tpc.entities.some((e) => e.name === 'user')).toBe(false);
    expect(table(tpc, 'sinh_vien').columns.map((c) => c.name)).toEqual([
      'id',
      'ho_ten',
      'email',
      'mat_khau_hash',
      'mssv',
      'diem_uy_tin',
    ]);
  });

  it('tuỳ chọn: tên bảng số nhiều / giữ nguyên, cột camelCase, khoá UUID, dialect', () => {
    const r = classToErd(input, {
      tableNaming: 'plural',
      columnNaming: 'camel',
      keyType: 'uuid',
      dialect: 'sqlserver',
    });
    const xe = table(r, 'xes');
    expect(col(xe, 'id')).toMatchObject({ type: 'UNIQUEIDENTIFIER', autoIncrement: true });
    expect(col(xe, 'bienSo')).toMatchObject({ type: 'NVARCHAR', length: 255 });
    expect(col(xe, 'chuXeId')).toBeDefined();
    expect(classToErd(input, { tableNaming: 'keep' }).entities.some((e) => e.name === 'PhienGuiXe')).toBe(true);
    expect(snakeCase('PhienGuiXe')).toBe('phien_gui_xe');
    expect(snakeCase('TheRFID')).toBe('the_rfid');
    expect(snakeCase('Đơn hàng')).toBe('don_hang');
    expect(plural('category')).toBe('categories');
    expect(plural('box')).toBe('boxes');
  });
});

describe('ORM: N-N, association class, [*], embeddable, kiểu lạ', () => {
  const attr = (s: string) => parseAttribute(s)!;
  const cls = (id: string, name: string, attrs: string[], o: Partial<OrmInput['classes'][number]> = {}) => ({
    id,
    name,
    kind: 'class' as const,
    stereotypes: ['entity'],
    isAbstract: false,
    attributes: attrs.map(attr),
    literals: [],
    ...o,
  });
  const end = (classId: string, multiplicity: string, role = '') => ({
    classId,
    multiplicity,
    role,
    navigable: 'unspecified' as const,
    aggregation: 'none' as const,
  });

  it('* – * → bảng trung gian a_b với PK ghép 2 FK', () => {
    const input: OrmInput = {
      classes: [cls('a', 'GoiThang', ['- id : UUID {id}']), cls('b', 'Xe', ['- bienSo : String'])],
      associations: [{ id: 'as', name: '', ends: [end('a', '*'), end('b', '1..*')] }],
      generalizations: [],
    };
    const r = classToErd(input);
    expect(r.report).toMatchObject({ tables: 3, junctionTables: 1, foreignKeys: 2 });
    const j = table(r, 'goi_thang_xe');
    expect(j.columns.map((c) => [c.name, c.pk, c.type])).toEqual([
      ['goi_thang_id', true, 'UUID'],
      ['xe_id', true, 'BIGINT'],
    ]);
    expect(r.relationships.every((x) => x.identifying && x.onDelete === 'CASCADE')).toBe(true);
  });

  it('association class → bảng trung gian mang tên + cột của association class', () => {
    const input: OrmInput = {
      classes: [
        cls('a', 'SinhVien', []),
        cls('b', 'LopHoc', []),
        cls('ac', 'DangKy', ['- ngayDangKy : Date', '- diem : Decimal [0..1]'], {
          kind: 'associationClass',
          associationId: 'as',
        }),
      ],
      associations: [{ id: 'as', name: '', ends: [end('a', '*'), end('b', '*')] }],
      generalizations: [],
    };
    const r = classToErd(input);
    expect(r.entities.map((e) => e.name)).toEqual(['sinh_vien', 'lop_hoc', 'dang_ky']);
    expect(table(r, 'dang_ky').columns.map((c) => c.name)).toEqual([
      'sinh_vien_id',
      'lop_hoc_id',
      'ngay_dang_ky',
      'diem',
    ]);
  });

  it('thuộc tính [*] kiểu cơ bản → bảng phụ <bang>_<thuoc_tinh>; embeddable gộp có tiền tố; transient/static bỏ qua', () => {
    const input: OrmInput = {
      classes: [
        cls('a', 'Xe', [
          '- bienSo : String',
          '- anh : String [*]',
          '- diaChi : DiaChi [0..1]',
          '- $dem : int',
          '- /tuoi : int',
          '«transient» - tam : String',
          '- toaDo : ToaDo',
        ]),
        cls('d', 'DiaChi', ['- duong : String', '- thanhPho : String'], { kind: 'datatype', stereotypes: [] }),
      ],
      associations: [],
      generalizations: [],
    };
    const r = classToErd(input);
    expect(table(r, 'xe').columns.map((c) => [c.name, c.nullable])).toEqual([
      ['id', false],
      ['bien_so', false],
      ['dia_chi_duong', true],
      ['dia_chi_thanh_pho', true],
      ['toa_do', false],
    ]);
    expect(r.report.warnings).toEqual([expect.stringContaining('Kiểu lạ “ToaDo”')]);
    expect(table(r, 'xe_anh').columns.map((c) => [c.name, c.pk])).toEqual([
      ['xe_id', true],
      ['value', true],
    ]);
  });
});

describe('ORM: đồng bộ không nhân bản khi parse lại', () => {
  const place = () => {
    let i = 0;
    return () => ({ x: (i++ % 4) * 300, y: Math.floor(i / 4) * 260, w: 220, h: 160 });
  };
  const sync = (doc: Y.Doc, classDiagram: string, erd: string, mutate?: (sel: Set<string>) => void) => {
    const result = classToErd(ormInputFromDiagram(doc, classDiagram));
    const cur = erdState(doc, erd);
    const diff = diffErd(cur, result);
    const sel = defaultSelection(diff.items);
    mutate?.(sel);
    writeErdPlan(doc, erd, planSync(cur, diff, sel), { place: place() });
    return diff;
  };

  it('parse lần đầu → ERD mới; thêm thuộc tính → parse lại chỉ thêm 1 cột, vị trí bảng giữ nguyên', () => {
    const { doc, classDiagram, byName } = unipkDoc();
    const erd = createDiagram(doc, 'erd', 'ERD', null);
    const first = sync(doc, classDiagram, erd);
    expect(first.items.filter((i) => i.op === 'add' && i.level === 'table')).toHaveLength(9);
    expect([...viewsMap(doc, erd).values()]).toHaveLength(9);
    const { schema } = erdSchemaFromDiagram(doc, erd);
    expect(schema.entities).toHaveLength(9);
    expect(schema.relationships).toHaveLength(9);
    expect(validateErd(schema, 'postgresql').filter((i) => i.level === 'error')).toEqual([]);

    // dời 1 bảng rồi thêm thuộc tính cho Xe
    const views = viewsMap(doc, erd);
    const xeView = [...views.values()].find((v) => modelMap(doc).get(v.modelId!)?.name === 'xe')!;
    views.set(xeView.id, { ...xeView, x: 777, y: 555 });
    const xe = byName('Xe');
    modelMap(doc).set(xe.id, {
      ...xe,
      data: {
        ...xe.data,
        attributes: [...(xe.data.attributes as unknown[]), parseAttribute('- soKhung : String [0..1]')!],
      },
    });
    const again = sync(doc, classDiagram, erd);
    expect(again.items.map((i) => [i.op, i.level, i.label])).toEqual([['add', 'column', 'Cột so_khung']]);
    const after = erdSchemaFromDiagram(doc, erd).schema;
    expect(after.entities).toHaveLength(9);
    expect(after.entities.find((e) => e.name === 'xe')!.columns.map((c) => c.name)).toContain('so_khung');
    expect(views.get(xeView.id)).toMatchObject({ x: 777, y: 555 });
    expect([...views.values()]).toHaveLength(9);

    // parse lần 3 không đổi gì
    expect(sync(doc, classDiagram, erd).items).toEqual([]);
  });

  it('cột sửa tay → mặc định giữ; class bị xoá → đề xuất xoá bảng (mặc định không tick)', () => {
    const { doc, classDiagram, byName } = unipkDoc();
    const erd = createDiagram(doc, 'erd', 'ERD', null);
    sync(doc, classDiagram, erd);
    // sửa tay cột bien_so (VARCHAR(20)) trên ERD
    const xeEnt = [...modelMap(doc).values()].find((m) => m.kind === 'erd.entity' && m.name === 'xe')!;
    const cols = (xeEnt.data.columns as ErdEntity['columns']).map((c) =>
      c.name === 'bien_so' ? { ...c, length: 20, manuallyEdited: true } : c,
    );
    modelMap(doc).set(xeEnt.id, { ...xeEnt, data: { ...xeEnt.data, columns: cols } });
    // class: đổi kiểu bienSo thành Text, xoá class GoiThang khỏi Class Diagram
    const xe = byName('Xe');
    const attrs = (xe.data.attributes as { name: string; type: string }[]).map((a) =>
      a.name === 'bienSo' ? { ...a, type: 'Text' } : a,
    );
    modelMap(doc).set(xe.id, { ...xe, data: { ...xe.data, attributes: attrs } });
    const goi = byName('GoiThang');
    const cv = viewsMap(doc, classDiagram);
    for (const v of [...cv.values()]) if (v.modelId === goi.id) cv.delete(v.id);
    const diff = sync(doc, classDiagram, erd);
    const change = diff.items.find((i) => i.label === 'Cột bien_so')!;
    expect(change).toMatchObject({ op: 'change', manual: true, defaultOn: false });
    expect(diff.items.find((i) => i.key.startsWith('t-:'))).toMatchObject({
      label: 'Bảng goi_thang',
      defaultOn: false,
    });
    // không tick → giữ nguyên
    const s = erdSchemaFromDiagram(doc, erd).schema;
    expect(s.entities.find((e) => e.name === 'xe')!.columns.find((c) => c.name === 'bien_so')).toMatchObject({
      length: 20,
    });
    expect(s.entities.some((e) => e.name === 'goi_thang')).toBe(true);
    // tick xoá bảng → bảng, đường quan hệ và FK đi kèm bị xoá
    sync(doc, classDiagram, erd, (sel) => sel.add(diff.items.find((i) => i.key.startsWith('t-:'))!.key));
    const s2 = erdSchemaFromDiagram(doc, erd).schema;
    expect(s2.entities.some((e) => e.name === 'goi_thang')).toBe(false);
    expect(s2.relationships).toHaveLength(8);
  });

  it('parse một phần class (vùng chọn) không đề xuất xoá bảng của class không chọn', () => {
    const { doc, classDiagram, byName } = unipkDoc();
    const erd = createDiagram(doc, 'erd', 'ERD', null);
    sync(doc, classDiagram, erd);
    const input = ormInputFromDiagram(doc, classDiagram);
    const only = classToErd(input, { classIds: [byName('Xe').id] });
    const diff = diffErd(erdState(doc, erd), only);
    expect(diff.items.filter((i) => i.op === 'remove')).toEqual([]);
  });

  it('DDL PostgreSQL của ERD UniPark+ chạy được trên Postgres thật', async () => {
    const { doc, classDiagram } = unipkDoc();
    const r = classToErd(ormInputFromDiagram(doc, classDiagram));
    const sql = erdToDdl(
      { entities: r.entities, relationships: r.relationships, views: [], sequences: [], procedures: [], triggers: [] },
      'postgresql',
    );
    expect(sql).toContain(`CREATE TYPE loai_xe AS ENUM ('XE_MAY', 'O_TO', 'XE_DAP');`);
    expect(sql).toContain('CREATE TABLE "user" (');
    const db = new PGlite();
    await db.exec(sql);
    const t = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    expect(t.rows[0].n).toBe(9);
    const fk = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY'`,
    );
    expect(fk.rows[0].n).toBe(9);
    // dữ liệu thật: FK + enum hoạt động
    await db.exec(`
      INSERT INTO "user" (id, ho_ten, email, mat_khau_hash) VALUES ('00000000-0000-0000-0000-000000000001', 'A', 'a@x', 'h');
      INSERT INTO sinh_vien (id, mssv) VALUES ('00000000-0000-0000-0000-000000000001', '2271');
      INSERT INTO xe (bien_so, loai_xe, mau_xe, chu_xe_id) VALUES ('59A', 'XE_MAY', 'do', '00000000-0000-0000-0000-000000000001');
    `);
    await expect(
      db.exec(
        `INSERT INTO xe (bien_so, loai_xe, mau_xe, chu_xe_id) VALUES ('59B', 'XE_MAY', 'do', '00000000-0000-0000-0000-000000000009')`,
      ),
    ).rejects.toThrow();
    await db.close();
    // MySQL / SQL Server sinh đủ 9 bảng + 9 FK
    for (const d of ['mysql', 'sqlserver'] as const) {
      const out = erdToDdl(
        {
          entities: r.entities,
          relationships: r.relationships,
          views: [],
          sequences: [],
          procedures: [],
          triggers: [],
        },
        d,
      );
      expect(out.match(/CREATE TABLE/g)).toHaveLength(9);
      expect(out.match(/FOREIGN KEY/g)).toHaveLength(9);
    }
  }, 60_000);
});
