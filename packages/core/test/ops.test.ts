import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  childFolders,
  createDiagram,
  createFolder,
  deleteFolder,
  diagramsMap,
  duplicateDiagram,
  folderDiagrams,
  folderPath,
  importDiagramFile,
  modelMap,
  moveItems,
  readDiagram,
  toDiagramFile,
  viewsMap,
  writeContent,
} from '../src';

const setup = () => {
  const doc = new Y.Doc();
  const a = createFolder(doc, 'Phân tích', null);
  const b = createFolder(doc, 'Thiết kế', null);
  return { doc, a, b };
};

describe('thao tác thư mục / sơ đồ', () => {
  it('tạo thư mục lồng 3 cấp, đường dẫn đúng, tên không trùng', () => {
    const { doc, a } = setup();
    const a1 = createFolder(doc, 'Đặc tả', a);
    const a11 = createFolder(doc, 'UC đăng nhập', a1);
    expect(folderPath(doc, a11).map((f) => f.name)).toEqual(['Phân tích', 'Đặc tả', 'UC đăng nhập']);
    const dup = createFolder(doc, 'Đặc tả', a);
    expect(doc.getMap<{ name: string }>('folders').get(dup)!.name).toBe('Đặc tả 2');
  });

  it('kéo sơ đồ sang thư mục khác và đổi thứ tự (đánh lại 0..n)', () => {
    const { doc, a, b } = setup();
    const d1 = createDiagram(doc, 'usecase', 'UC 1', a);
    const d2 = createDiagram(doc, 'usecase', 'UC 2', a);
    const d3 = createDiagram(doc, 'class', 'Class', b);
    expect(moveItems(doc, [d3], d1, 'before')).toBe(true);
    expect(folderDiagrams(doc, a).map((d) => d.name)).toEqual(['Class', 'UC 1', 'UC 2']);
    expect(folderDiagrams(doc, b)).toHaveLength(0);
    expect(folderDiagrams(doc, a).map((d) => d.order)).toEqual([0, 1, 2]);
    expect(moveItems(doc, [d1], b, 'inside')).toBe(true);
    expect(folderDiagrams(doc, b).map((d) => d.id)).toEqual([d1]);
    expect(moveItems(doc, [d2], null, 'inside')).toBe(true);
    expect(diagramsMap(doc).get(d2)!.folderId).toBeNull();
  });

  it('không cho thả thư mục vào con cháu của nó; đổi thứ tự thư mục', () => {
    const { doc, a, b } = setup();
    const a1 = createFolder(doc, 'Con', a);
    expect(moveItems(doc, [a], a1, 'inside')).toBe(false);
    expect(moveItems(doc, [b], a, 'before')).toBe(true);
    expect(childFolders(doc, null).map((f) => f.name)).toEqual(['Thiết kế', 'Phân tích']);
  });

  it('xoá thư mục: cascade xoá hết; moveToParent chuyển nội dung lên cha', () => {
    const { doc, a } = setup();
    const a1 = createFolder(doc, 'Con', a);
    const d = createDiagram(doc, 'activity', 'Act', a1);
    const sub = createFolder(doc, 'Cháu', a1);
    deleteFolder(doc, a1, 'moveToParent');
    expect(diagramsMap(doc).get(d)!.folderId).toBe(a);
    expect(doc.getMap<{ parentId: string }>('folders').get(sub)!.parentId).toBe(a);
    deleteFolder(doc, a, 'cascade');
    expect(diagramsMap(doc).has(d)).toBe(false);
    expect(doc.getMap('folders').has(sub)).toBe(false);
  });

  it('nhân bản sơ đồ: id hình mới, giữ modelId (cùng phần tử)', () => {
    const { doc, a } = setup();
    const d = createDiagram(doc, 'class', 'Class', a);
    modelMap(doc).set('m_xe', { id: 'm_xe', kind: 'uml.class', name: 'Xe', data: {} });
    writeContent(doc, d, 'class', {
      views: [
        {
          id: 'v_1',
          shape: 'cls.class',
          modelId: 'm_xe',
          x: 0,
          y: 0,
          w: 100,
          h: 60,
          z: 0,
          parentId: null,
          props: {},
          style: {},
        },
      ],
      connectors: [],
    });
    const c = duplicateDiagram(doc, d)!;
    const copy = readDiagram(doc, c)!;
    expect(copy.name).toBe('Class (bản sao)');
    expect(copy.views[0].id).not.toBe('v_1');
    expect(copy.views[0].modelId).toBe('m_xe');
    expect(viewsMap(doc, d).has('v_1')).toBe(true);
  });

  it('xuất sơ đồ rồi nhập vào project khác → mở được, kèm phần tử mô hình', () => {
    const { doc, a } = setup();
    const d = createDiagram(doc, 'usecase', 'Use case', a);
    modelMap(doc).set('m_sv', { id: 'm_sv', kind: 'uml.actor', name: 'Sinh viên', data: {} });
    modelMap(doc).set('m_unused', { id: 'm_unused', kind: 'uml.actor', name: 'Khác', data: {} });
    writeContent(doc, d, 'usecase', {
      views: [
        {
          id: 'v_a',
          shape: 'uc.actor',
          modelId: 'm_sv',
          x: 0,
          y: 0,
          w: 40,
          h: 80,
          z: 0,
          parentId: null,
          props: {},
          style: {},
        },
      ],
      connectors: [],
    });
    const file = toDiagramFile(readDiagram(doc, d)!, [...modelMap(doc).values()]);
    expect(file.model.map((m) => m.name)).toEqual(['Sinh viên']);

    const other = new Y.Doc();
    const nid = importDiagramFile(other, file, null, 'reuse');
    const imported = readDiagram(other, nid)!;
    expect(imported.views[0].modelId).toBe('m_sv');
    expect(modelMap(other).get('m_sv')!.name).toBe('Sinh viên');

    // nhập lại vào chính project gốc, chọn "Tạo bản sao" → phần tử mô hình id mới
    const n2 = importDiagramFile(doc, file, a, 'copy');
    const copy = readDiagram(doc, n2)!;
    expect(copy.views[0].modelId).not.toBe('m_sv');
    expect(modelMap(doc).get(copy.views[0].modelId!)!.name).toBe('Sinh viên');
  });
});

describe('nhập JSON vào sơ đồ đang mở', () => {
  it('Gộp thêm dịch xuống dưới nội dung cũ; Thay thế xoá nội dung cũ; khác loại báo lỗi rõ', async () => {
    const { importIntoDiagram } = await import('../src');
    const doc = new Y.Doc();
    const d = createDiagram(doc, 'class', 'Class', null);
    const v = (id: string, y: number) => ({
      id,
      shape: 'cls.class',
      modelId: null,
      x: 0,
      y,
      w: 100,
      h: 60,
      z: 0,
      parentId: null,
      props: {},
      style: {},
    });
    writeContent(doc, d, 'class', { views: [v('v_a', 0)], connectors: [] });
    const file = toDiagramFile(readDiagram(doc, d)!, []);
    importIntoDiagram(doc, d, file, 'merge');
    const merged = readDiagram(doc, d)!.views;
    expect(merged).toHaveLength(2);
    expect(Math.max(...merged.map((x) => x.y))).toBe(180);
    importIntoDiagram(doc, d, file, 'replace');
    expect(readDiagram(doc, d)!.views).toHaveLength(1);
    const other = createDiagram(doc, 'sequence', 'Seq', null);
    expect(() => importIntoDiagram(doc, other, file, 'merge')).toThrow(
      'Tệp này là Class Diagram, không nhập được vào Sequence Diagram.',
    );
  });
});
