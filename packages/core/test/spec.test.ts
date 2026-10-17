import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  addFlow,
  createDiagram,
  editFlowSteps,
  insertStep,
  modelMap,
  moveStep,
  normSpec,
  parseImport,
  readSpec,
  removeStep,
  specContext,
  specsDocx,
  specToMarkdown,
  updateFlow,
  validateSpec,
  writeSpec,
  type UseCaseSpec,
} from '../src';
import { UC03, UC03_MODEL } from './fixtures/uc03';

const refs = (s: UseCaseSpec) =>
  [...s.alternativeFlows, ...s.exceptionFlows].map((f) => [
    f.code,
    f.branchAt,
    f.end.kind === 'returnTo' ? f.end.stepNo : f.end.kind,
  ]);

describe('Đặc tả use case — luồng sự kiện', () => {
  it('fixture UC03: 7 bước, A1 tại 4 quay lại 5, E1 tại 2, E2 tại 5', () => {
    expect(UC03.mainFlow.map((s) => s.no)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(refs(UC03)).toEqual([
      ['A1', 4, 5],
      ['E1', 2, 'endFailure'],
      ['E2', 5, 'endFailure'],
    ]);
    expect(validateSpec(UC03, { hasUseCase: true })).toEqual([]);
  });

  it('chèn bước giữa 3 và 4 → A1 "tại bước 5", "quay lại bước 6"; E2 tại 6; E1 giữ 2', () => {
    const s = insertStep(UC03, 3, { text: 'Hiển thị biển số nhận dạng được.' });
    expect(s.mainFlow).toHaveLength(8);
    expect(s.mainFlow[3].text).toBe('Hiển thị biển số nhận dạng được.');
    expect(s.mainFlow.map((x) => x.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(refs(s)).toEqual([
      ['A1', 5, 6],
      ['E1', 2, 'endFailure'],
      ['E2', 6, 'endFailure'],
    ]);
    // sau bước của Hệ thống → bước mới mặc định là actor gần nhất
    expect(s.mainFlow[3].performer).toEqual({ kind: 'actor', actorId: 'm_sv' });
  });

  it('kéo bước 2 xuống cuối → E1 bám theo bước đó (tại bước 7)', () => {
    const s = moveStep(UC03, 1, 6);
    expect(s.mainFlow[6].id).toBe('s2');
    expect(refs(s)).toEqual([
      ['A1', 3, 4],
      ['E1', 7, 'endFailure'],
      ['E2', 4, 'endFailure'],
    ]);
  });

  it('xoá bước đang được tham chiếu → Kiểm tra báo rẽ/quay lại bước không tồn tại', () => {
    let s = removeStep(UC03, 's5');
    s = removeStep(s, 's6');
    s = removeStep(s, 's7');
    const issues = validateSpec(s, { hasUseCase: true }).map((i) => i.message);
    expect(issues).toContain('A1 quay lại bước 5 không tồn tại');
    expect(issues).toContain('E2 rẽ từ bước 5 không tồn tại');
  });

  it('thêm luồng ngoại lệ → mã E3, bước E3.1; sửa luồng giữ mã', () => {
    const { spec, flow } = addFlow(UC03, 'exceptionFlows', 3, 'Camera lỗi');
    expect(flow.code).toBe('E3');
    const s2 = editFlowSteps(spec, flow.id, (st) => [...st, { ...st[0], id: 'x', text: 'Chuyển bảo vệ nhập tay' }]);
    expect(s2.exceptionFlows[2].steps.map((x) => x.no)).toEqual([1, 2]);
    const s3 = updateFlow(s2, 'e1', { name: 'Thẻ bị khoá' });
    expect(s3.exceptionFlows[0].name).toBe('Thẻ bị khoá');
    expect(validateSpec(s2, { hasUseCase: true }).map((i) => i.message)).toContain('Bước E3.1 đang rỗng');
  });

  it('thiếu actor chính / bước rỗng / chưa gắn use case được báo', () => {
    const s = normSpec({ useCaseId: 'x', mainFlow: [{ text: '' }] });
    expect(validateSpec(s, { hasUseCase: false }).map((i) => i.message)).toEqual([
      'Đặc tả chưa gắn với use case nào',
      'Use case chưa có tác nhân chính',
      'Bước 1 của luồng chính đang rỗng',
    ]);
  });
});

describe('Đặc tả use case — lưu & xuất', () => {
  const setup = () => {
    const doc = new Y.Doc();
    for (const m of UC03_MODEL) modelMap(doc).set(m.id, m);
    const id = createDiagram(doc, 'usecase-spec', 'Đặc tả UC03', null, undefined, { data: { useCaseId: 'm_uc03' } });
    return { doc, id };
  };

  it('serialize: ghi vào Y.Doc rồi đọc lại giống hệt; version tăng khi nội dung đổi', () => {
    const { doc, id } = setup();
    expect(writeSpec(doc, id, UC03)).toBe(true);
    const back = readSpec(doc, id);
    expect({ ...back, version: 0 }).toEqual({ ...UC03, version: 0 });
    const v = back.version;
    expect(writeSpec(doc, id, back)).toBe(false);
    expect(writeSpec(doc, id, insertStep(back, 7))).toBe(true);
    expect(readSpec(doc, id).version).toBe(v + 1);
    expect(readSpec(doc, id).mainFlow).toHaveLength(8);
  });

  it('Markdown có bảng thông tin và bảng luồng 3 cột', () => {
    const { doc } = setup();
    const md = specToMarkdown(UC03, specContext(doc, UC03));
    expect(md).toContain('## UC03 – Check-in xe vào bãi');
    expect(md).toContain('| Tác nhân phụ | Bảo vệ, Thiết bị cổng |');
    expect(md).toContain('| 1 | Sinh viên | Quét thẻ RFID tại cổng vào. |');
    expect(md).toContain('#### A1 – Biển số không khớp (tại bước 4)');
    expect(md).toContain('| A1.2 | Bảo vệ | Xác nhận thủ công. |');
    expect(md).toContain('_Quay lại bước 5_');
  });

  it('DOCX sinh được, đúng font Times New Roman 13, cột trái xám, nhiều bảng có tiêu đề', async () => {
    const { doc } = setup();
    const ctx = specContext(doc, UC03);
    const bytes = await specsDocx([
      { spec: UC03, ctx },
      { spec: insertStep(UC03, 3, { text: 'Bước chèn' }), ctx },
    ]);
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]); // "PK"
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Bảng 1: Đặc tả use case UC03');
    expect(xml).toContain('Bảng 2: Đặc tả use case UC03');
    expect(xml).toContain('Check-in xe vào bãi');
    expect(xml).toContain('Biển số không khớp (tại bước 4)');
    expect(xml).toContain('D9D9D9');
    expect(xml).toContain('Times New Roman');
    expect(xml).toContain('w:val="26"');
  });

  it('ảnh màn hình dán vào đặc tả: giữ khi chuẩn hoá, nhúng vào DOCX, có trong Markdown', async () => {
    // PNG 1×1 trong suốt
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const spec = normSpec({
      ...UC03,
      images: [
        { id: 'i1', name: 'cong.png', src: png, w: 1, h: 1, caption: 'Màn hình cổng' },
        { id: 'x', src: 'http://bad' },
      ],
    });
    expect(spec.images).toEqual([{ id: 'i1', name: 'cong.png', src: png, w: 1, h: 1, caption: 'Màn hình cổng' }]);
    const { doc } = setup();
    const bytes = await specsDocx([{ spec, ctx: specContext(doc, spec) }]);
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).some((f) => f.startsWith('word/media/'))).toBe(true);
    expect(await zip.file('word/document.xml')!.async('string')).toContain('Màn hình cổng');
    expect(specToMarkdown(spec, specContext(doc, spec))).toContain('![Màn hình cổng](data:image/png');
  });

  it('tệp fixture docs/reference/uc03-spec.umlab.json nhập được, dữ liệu đúng UC03', () => {
    const p = parseImport(
      readFileSync(new URL('../../../docs/reference/uc03-spec.umlab.json', import.meta.url), 'utf8'),
    );
    if (p.kind !== 'diagram') throw new Error('sai loại tệp');
    expect(p.file.diagram.type).toBe('usecase-spec');
    expect(normSpec(p.file.diagram.data)).toEqual(UC03);
    expect(p.file.model.map((m) => m.id).sort()).toEqual(['m_bv', 'm_gate', 'm_sv', 'm_uc03']);
  });
});
