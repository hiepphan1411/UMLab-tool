import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  connsMap,
  createDiagram,
  deleteModelEverywhere,
  diagramsMap,
  modelGroupOf,
  modelMap,
  modelUsages,
  orphanModels,
  searchProject,
  traceMatrix,
  unipkClassModel,
  usageCounts,
  viewsMap,
  type ModelElement,
  type View,
} from '../src';
import { UC03, UC03_MODEL } from './fixtures/uc03';

const view = (shape: string, modelId: string | null, x = 0, extra: Partial<View> = {}): View => ({
  id: `v_${shape}_${modelId}_${x}`,
  shape,
  modelId,
  x,
  y: 0,
  w: 100,
  h: 60,
  z: 0,
  parentId: null,
  props: {},
  style: {},
  ...extra,
});

/** Bộ UniPark+: Use Case (UC03 + actor), đặc tả UC03, Class UniPark+, Activity + Sequence sinh từ đặc tả. */
function unipk() {
  const doc = new Y.Doc();
  const uc = createDiagram(doc, 'usecase', 'Use case UniPark+', null, undefined, {
    model: UC03_MODEL,
    views: [view('uc.usecase', 'm_uc03'), view('uc.actor', 'm_sv', 300), view('uc.actor', 'm_gate', 500)],
    connectors: [
      {
        id: 'c_assoc',
        kind: 'uc.association',
        modelId: null,
        source: { viewId: 'v_uc.actor_m_sv_300' },
        target: { viewId: 'v_uc.usecase_m_uc03_0' },
        routing: 'straight',
        waypoints: [],
        labels: [],
        props: {},
        style: {},
        z: 1,
      },
    ],
  });
  const spec = createDiagram(doc, 'usecase-spec', 'Đặc tả UC03 Check-in xe vào bãi', null, undefined, { data: UC03 });
  const { classes } = unipkClassModel();
  const cls = createDiagram(doc, 'class', 'Class UniPark+', null, undefined, {
    model: classes.map((c) => c.model),
    views: classes.map((c, i) => view('cls.class', c.model.id, i * 120)),
  });
  const gd = classes.find((c) => c.model.name === 'GiaoDich')!.model;
  const lifeline: ModelElement = { id: 'm_ll', kind: 'uml.lifeline', name: 'gd', data: { baseClassifier: gd.id } };
  const gf = { sourceDiagramId: spec, sourceVersion: 1 };
  const act = createDiagram(doc, 'activity', 'Activity - UC03 Check-in xe vào bãi', null, undefined, {
    generatedFrom: { ...gf, generator: 'spec-activity@1' },
  });
  const seq = createDiagram(doc, 'sequence', 'Sequence - UC03 Check-in xe vào bãi', null, undefined, {
    generatedFrom: { ...gf, generator: 'spec-sequence@1' },
    model: [lifeline],
    views: [view('seq.actor', 'm_sv'), view('seq.lifeline', 'm_ll', 200)],
  });
  return { doc, uc, spec, cls, act, seq, classes };
}

describe('Chỉ mục mô hình (P12)', () => {
  it('nơi xuất hiện: actor "Sinh viên" ở Use Case + Sequence; đếm số sơ đồ một lượt', () => {
    const { doc, uc, seq } = unipk();
    expect(modelUsages(doc, 'm_sv').map((u) => u.diagram.id)).toEqual([uc, seq]);
    expect(usageCounts(doc).get('m_sv')).toBe(2);
    expect(usageCounts(doc).get('m_uc03')).toBe(1);
    expect(modelGroupOf('uml.actor')).toBe('actors');
    expect(modelGroupOf('erd.entity')).toBe('entities');
    expect(modelGroupOf('x.y')).toBe('other');
  });

  it('ma trận truy vết UniPark+: UC03 có đặc tả, Activity, Sequence và 6 class liên quan', () => {
    const { doc, spec, act, seq } = unipk();
    const rows = traceMatrix(doc);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.code).toBe('UC03');
    expect(r.specs.map((d) => d.id)).toEqual([spec]);
    expect(r.activities.map((d) => d.id)).toEqual([act]);
    expect(r.sequences.map((d) => d.id)).toEqual([seq]);
    // 5 entity của đặc tả (khớp tên class) + GiaoDich (lifeline gắn baseClassifier trong Sequence)
    expect(r.classes.map((c) => c.name)).toEqual(['GiaoDich', 'GoiThang', 'PhienGuiXe', 'TheRFID', 'ViDienTu', 'Xe']);
    // use case chưa có đặc tả → hàng trống
    modelMap(doc).set('m_uc09', { id: 'm_uc09', kind: 'uml.usecase', name: 'Xem lịch sử', data: { code: 'UC09' } });
    const r9 = traceMatrix(doc).find((x) => x.code === 'UC09')!;
    expect([r9.specs, r9.activities, r9.sequences, r9.classes].every((x) => x.length === 0)).toBe(true);
    expect(traceMatrix(doc).map((x) => x.code)).toEqual(['UC03', 'UC09']);
  });

  it('tìm kiếm toàn project: "check" → use case, đặc tả UC03 và activity sinh từ nó; tìm theo bước, không dấu', () => {
    const { doc } = unipk();
    const r = searchProject(doc, 'check');
    expect(r.model.map((m) => m.name)).toContain('Check-in xe vào bãi');
    expect(r.diagrams.map((d) => d.name)).toEqual(
      expect.arrayContaining(['Đặc tả UC03 Check-in xe vào bãi', 'Activity - UC03 Check-in xe vào bãi']),
    );
    const s = searchProject(doc, 'kiem tra the');
    expect(s.steps[0]).toMatchObject({ label: 'UC03 · bước 2' });
    expect(searchProject(doc, 'uc03').model.map((m) => m.id)).toEqual(['m_uc03']);
    expect(searchProject(doc, 'thong bao nap').steps[0].label).toBe('UC03 · E2.1');
    expect(searchProject(doc, '  ').diagrams).toEqual([]);
  });

  it('phần tử mồ côi: không còn hình và không được tham chiếu; actor phụ được đặc tả tham chiếu không mồ côi', () => {
    const { doc } = unipk();
    modelMap(doc).set('m_orphan', { id: 'm_orphan', kind: 'uml.class', name: 'Rac', data: {} });
    const ids = orphanModels(doc).map((m) => m.id);
    expect(ids).toContain('m_orphan');
    expect(ids).not.toContain('m_bv'); // không có hình nhưng là tác nhân phụ trong đặc tả
    expect(ids).not.toContain('m_ll');
    expect(ids).not.toContain(unipkClassModel().classes[0].model.id);
  });

  it('xoá khỏi mô hình: xoá hình ở mọi sơ đồ, đường nối treo theo, rồi phần tử', () => {
    const { doc, uc, seq } = unipk();
    doc.transact(() => deleteModelEverywhere(doc, ['m_sv']));
    expect(modelMap(doc).has('m_sv')).toBe(false);
    expect([...viewsMap(doc, uc).values()].some((v) => v.modelId === 'm_sv')).toBe(false);
    expect([...viewsMap(doc, seq).values()].some((v) => v.modelId === 'm_sv')).toBe(false);
    expect(connsMap(doc, uc).size).toBe(0);
    expect(diagramsMap(doc).size).toBe(5);
  });
});
