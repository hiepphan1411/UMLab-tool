import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { entityData, parseColumn, relData, type Connector } from '@umlab/core';
import type { ProjectSession } from '../../workspace/session';
import { Engine } from '../engine/engine';
import { createConnector, createView, deleteSelection } from '../engine/ops';
import { connLook, getConnector, getRules, getShape } from '../engine/registry';
import { makeJunction, setEntityColumns } from './ops';
import { linesToColumns } from './table';
import { unipkErdTemplate } from './template';
import './index';

function setup() {
  const doc = new Y.Doc();
  const session = { doc, setPresence: () => {} } as unknown as ProjectSession;
  return new Engine(session, 'd1', 'erd', false, 'u1');
}
const ent = (e: Engine, viewId: string) => e.lookup.model(e.lookup.view(viewId)!.modelId)!;
function table(e: Engine, x: number, name: string, cols: string[]) {
  const id = createView(e, 'erd.entity', x, 0)!;
  const m = ent(e, id);
  e.apply((tx) => {
    tx.setModel(m.id, { name });
    setEntityColumns(
      tx,
      m.id,
      cols.map((c) => parseColumn(c)!),
    );
  });
  return id;
}

describe('ERD: quan hệ', () => {
  it('One-to-Many xe → phien_gui_xe: phien_gui_xe.xe_id tự xuất hiện, kiểu = PK cha, có FK', () => {
    const e = setup();
    const xe = table(e, 0, 'xe', ['id bigint pk ai', 'bien_so varchar(20) not null unique']);
    const ph = table(e, 400, 'phien_gui_xe', ['id bigint pk ai', 'gio_vao timestamptz not null']);
    const cid = createConnector(e, 'erd.rel1n', { viewId: xe }, { viewId: ph })!;
    const fk = entityData(ent(e, ph)).columns.find((c) => c.name === 'xe_id')!;
    expect(fk).toMatchObject({ type: 'BIGINT', nullable: false, pk: false, autoIncrement: false });
    expect(fk.fk?.refEntityId).toBe(ent(e, xe).id);
    const rel = relData(e.lookup.model(e.lookup.conn(cid)!.modelId));
    expect(rel.fkColumns).toEqual([{ childColumnId: fk.id, parentColumnId: entityData(ent(e, xe)).columns[0].id }]);
    // non-identifying → nét đứt, cha ‖ con ○<
    const c = e.lookup.conn(cid)!;
    expect(connLook(getConnector(c.kind), c, e.lookup.model(c.modelId)!, e.lookup)).toMatchObject({
      line: 'dashed',
      start: 'cf-one-only',
      end: 'cf-zero-many',
    });
  });

  it('One-to-One thêm UNIQUE; cha chưa có PK → tự thêm id', () => {
    const e = setup();
    const a = table(e, 0, 'sinh_vien', ['mssv varchar(10)']);
    const b = table(e, 400, 'vi_dien_tu', ['so_du numeric(19,4)']);
    createConnector(e, 'erd.rel11', { viewId: a }, { viewId: b });
    expect(entityData(ent(e, a)).columns[0]).toMatchObject({ name: 'id', pk: true, type: 'BIGINT' });
    expect(entityData(ent(e, b)).columns.find((c) => c.name === 'sinh_vien_id')).toMatchObject({ unique: true });
  });

  it('đổi tên/kiểu PK cha → FK con đổi theo', () => {
    const e = setup();
    const xe = table(e, 0, 'xe', ['id bigint pk']);
    const ph = table(e, 400, 'phien', ['id bigint pk']);
    createConnector(e, 'erd.rel1n', { viewId: xe }, { viewId: ph });
    const m = ent(e, xe);
    e.apply((tx) =>
      setEntityColumns(
        tx,
        m.id,
        entityData(m).columns.map((c) => ({ ...c, name: 'ma', type: 'UUID' })),
      ),
    );
    expect(entityData(ent(e, ph)).columns.find((c) => c.fk)).toMatchObject({ name: 'xe_ma', type: 'UUID' });
  });

  it('Many-to-Many → bảng trung gian (PK ghép 2 FK) + 2 quan hệ 1-N identifying', () => {
    const e = setup();
    const a = table(e, 0, 'goi_thang', ['id uuid pk']);
    const b = table(e, 400, 'xe', ['id bigint pk']);
    const cid = createConnector(e, 'erd.relnn', { viewId: a }, { viewId: b })!;
    expect(
      getRules('erd')
        .flatMap((r) => r({ lookup: e.lookup, views: e.lookup.views(), conns: e.lookup.conns(), shape: getShape }))
        .some((i) => /N-N/.test(i.message)),
    ).toBe(true);
    makeJunction((fn) => e.apply(fn), cid);
    const j = e.lookup.views().find((v) => ent(e, v.id).name === 'goi_thang_xe')!;
    expect(entityData(ent(e, j.id)).columns.map((c) => [c.name, c.pk])).toEqual([
      ['goi_thang_id', true],
      ['xe_id', true],
    ]);
    const conns = e.lookup.conns();
    expect(conns.map((c) => c.kind)).toEqual(['erd.rel1n', 'erd.rel1n']);
    const look = connLook(getConnector('erd.rel1n'), conns[0], e.lookup.model(conns[0].modelId)!, e.lookup);
    expect(look.line).toBe('solid');
  });

  it('xoá đường quan hệ → xoá phần tử quan hệ (cột FK hỏi sau)', () => {
    const e = setup();
    const xe = table(e, 0, 'xe', ['id bigint pk']);
    const ph = table(e, 400, 'phien', ['id bigint pk']);
    const cid = createConnector(e, 'erd.rel1n', { viewId: xe }, { viewId: ph })!;
    const relId = e.lookup.conn(cid)!.modelId!;
    e.select([], [cid]);
    deleteSelection(e);
    expect(e.lookup.conn(cid)).toBeUndefined();
    expect(e.lookup.model(relId)).toBeUndefined();
  });

  it('chỉ nối giữa hai Entity', () => {
    const e = setup();
    const a = table(e, 0, 'a', ['id int pk']);
    const s = createView(e, 'erd.sequence', 400, 0)!;
    const vc = (id: string) => ({
      view: e.lookup.view(id)!,
      def: getShape(e.lookup.view(id)!.shape),
      model: ent(e, id),
    });
    expect(getConnector('erd.rel1n')!.allow!(vc(a), vc(s), e.lookup)).toMatch(/hai Entity/);
    expect(getConnector('erd.rel1n')!.allow!(vc(a), vc(a), e.lookup)).toBe(true);
  });
});

describe('ERD: sửa cột trên hình', () => {
  it('dòng gõ ghép với cột cũ theo tên → giữ id / FK; dòng mới thêm cột', () => {
    const fk = { relationshipId: 'r', refEntityId: 'x', refColumnId: 'k' };
    const old = [parseColumn('id bigint pk')!, { ...parseColumn('xe_id bigint not null')!, fk }];
    const cols = linesToColumns(['xe_id bigint not null', 'id bigint pk', 'email varchar(255) unique not null'], old);
    expect(cols.map((c) => c.id).slice(0, 2)).toEqual([old[1].id, old[0].id]);
    expect(cols[0].fk).toEqual(fk);
    expect(cols[2]).toMatchObject({ name: 'email', length: 255, unique: true, nullable: false });
    // đổi tên tại chỗ (cùng vị trí) vẫn giữ id
    expect(linesToColumns(['ma bigint pk', 'xe_id bigint'], old)[0].id).toBe(old[0].id);
  });

  it('Alt+Shift+C thêm cột và mở sửa ngăn cột', () => {
    const e = setup();
    const a = table(e, 0, 'a', ['id int pk']);
    let key: string | void = undefined;
    e.apply((tx) => (key = getShape('erd.entity')!.shortcuts!['Alt+Shift+C'](tx, e.lookup.view(a)!)));
    expect(key).toBe('cols');
    expect(entityData(ent(e, a)).columns.map((c) => c.name)).toEqual(['id', 'cot_moi']);
  });

  it('kiểm tra: bảng thiếu PK có sửa nhanh "Thêm khoá chính id"', () => {
    const e = setup();
    const a = table(e, 0, 'order', ['ten text']);
    const issues = getRules('erd').flatMap((r) =>
      r({ lookup: e.lookup, views: e.lookup.views(), conns: e.lookup.conns() as Connector[], shape: getShape }),
    );
    expect(issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([expect.stringMatching(/chưa có khoá chính/), expect.stringMatching(/từ khoá SQL/)]),
    );
    const fix = issues.find((i) => i.fix)!;
    e.apply((tx) => fix.fix!.run(tx));
    expect(entityData(ent(e, a)).columns[0]).toMatchObject({ name: 'id', pk: true });
  });
});

describe('ERD: mẫu UniPark+', () => {
  it('9 bảng, 9 quan hệ, bố cục không chồng nhau', async () => {
    const t = await unipkErdTemplate();
    expect(t.views).toHaveLength(9);
    expect(t.connectors).toHaveLength(9);
    const boxes = t.views!;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
  });
});
