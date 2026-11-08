import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  dataMap,
  decodeData,
  emptyMindmap,
  encodeData,
  mindAddNode,
  mindColor,
  mindMoveNode,
  mindRemoveNode,
  mindReplace,
  mindSetMeta,
  mindSetNode,
  mindTree,
  normMindmap,
  parseImport,
  parseRefsText,
  readMindmap,
  refsToText,
} from '../src';

const D = 'dg1';
const fresh = () => {
  const doc = new Y.Doc();
  mindReplace(doc, D, emptyMindmap('Trung tâm'));
  return doc;
};

describe('Mindmap – chuẩn hoá', () => {
  it('luôn có đúng một root; parent hỏng và vòng lặp gắn về root', () => {
    const d = normMindmap({
      nodes: [
        { id: 'a', title: 'A', parentId: 'b' },
        { id: 'b', title: 'B', parentId: 'a' },
        { id: 'c', title: 'C', parentId: 'không-có' },
      ],
    });
    const t = mindTree(d);
    expect(d.nodes.filter((n) => !n.parentId)).toHaveLength(1);
    expect(t.root.kind).toBe('root');
    for (const n of d.nodes) if (n !== t.root) expect(t.path(n.id)[0].id).toBe(t.root.id);
  });

  it('đọc danh sách tài liệu dạng báo cáo (có \\[n\\] và Available: <url>)', () => {
    const refs = parseRefsText(
      String.raw`\[7\] NestJS. Documentation. Available: <https://docs.nestjs.com/>
[20] R. C. Martin. Clean Code. Prentice Hall, 2008.`,
    );
    expect(refs).toEqual([
      { id: 7, text: 'NestJS. Documentation.', url: 'https://docs.nestjs.com/' },
      { id: 20, text: 'R. C. Martin. Clean Code. Prentice Hall, 2008.' },
    ]);
    expect(parseRefsText(refsToText(refs))).toEqual(refs);
  });
});

describe('Mindmap trên Y.Doc', () => {
  it('thêm con / cùng cấp đúng thứ tự, đổi cha, xoá cả nhánh', () => {
    const doc = fresh();
    const root = mindTree(readMindmap(doc, D)).root.id;
    const a = mindAddNode(doc, D, root, { title: 'A' });
    const c = mindAddNode(doc, D, root, { title: 'C' });
    const b = mindAddNode(doc, D, root, { title: 'B' }, a.id);
    expect(a.kind).toBe('branch');
    let t = mindTree(readMindmap(doc, D));
    expect(t.children(root).map((n) => n.title)).toEqual(['A', 'B', 'C']);

    const a1 = mindAddNode(doc, D, a.id, { title: 'A1' });
    expect(a1.kind).toBe('topic');
    mindSetNode(doc, D, a1.id, { off: { dx: 30, dy: 40 } });
    expect(mindMoveNode(doc, D, a.id, a1.id, 0)).toBe(false); // không thả vào con cháu
    expect(mindMoveNode(doc, D, a1.id, c.id, 0)).toBe(true);
    t = mindTree(readMindmap(doc, D));
    expect(t.byId.get(a1.id)!.parentId).toBe(c.id);
    expect(t.byId.get(a1.id)!.off).toBeNull();

    mindRemoveNode(doc, D, c.id);
    t = mindTree(readMindmap(doc, D));
    expect(t.byId.has(c.id)).toBe(false);
    expect(t.byId.has(a1.id)).toBe(false);
    expect(t.children(root).map((n) => n.id)).toEqual([a.id, b.id]);
    mindRemoveNode(doc, D, root);
    expect(mindTree(readMindmap(doc, D)).root.id).toBe(root);
  });

  it('mỗi node một khoá (encode/decode) và meta riêng', () => {
    const doc = fresh();
    mindSetMeta(doc, D, { locked: true, layout: 'right' });
    const m = dataMap(doc, D);
    expect([...m.keys()].filter((k) => k.startsWith('node:'))).toHaveLength(1);
    const d = readMindmap(doc, D);
    expect(d.locked).toBe(true);
    expect(d.layout).toBe('right');
    const enc = encodeData('mindmap', d);
    expect(Object.keys(enc).sort()).toEqual(['meta', 'node:' + d.nodes[0].id]);
    expect(normMindmap(decodeData('mindmap', enc)).nodes[0].title).toBe('Trung tâm');
  });

  it('màu: kế thừa nhánh cấp 1 theo bảng màu, màu riêng ghi đè', () => {
    const doc = fresh();
    const root = mindTree(readMindmap(doc, D)).root.id;
    const a = mindAddNode(doc, D, root, { title: 'A' });
    const b = mindAddNode(doc, D, root, { title: 'B', color: '#123456' });
    const a1 = mindAddNode(doc, D, a.id, { title: 'A1' });
    const b1 = mindAddNode(doc, D, b.id, { title: 'B1' });
    const t = mindTree(readMindmap(doc, D));
    expect(mindColor(t, a1.id)).toBe(mindColor(t, a.id));
    expect(mindColor(t, b1.id)).toBe('#123456');
  });
});

describe('Mindmap mẫu UniPark+ (docs/reference)', () => {
  it.each(['unipark-mindmap.umlab.json', 'unipark-mindmap-chi-tiet.umlab.json'])(
    '%s: nhập được, đủ 42 tài liệu, trích dẫn hợp lệ',
    (file) => {
      const text = readFileSync(resolve(__dirname, '../../../docs/reference/' + file), 'utf8');
      const p = parseImport(text);
      expect(p.kind).toBe('diagram');
      if (p.kind !== 'diagram') return;
      expect(p.file.diagram.type).toBe('mindmap');
      const d = normMindmap(p.file.diagram.data);
      expect(d.references).toHaveLength(42);
      expect(mindTree(d).root.title).toBe('Hệ thống UniPark+');
      const ids = new Set(d.references.map((r) => r.id));
      for (const n of d.nodes) for (const r of n.refs) expect(ids.has(r)).toBe(true);
      expect(d.nodes.filter((n) => n.kind === 'question').length).toBeGreaterThan(30);
    },
  );
});

describe('Mindmap chi tiết', () => {
  it('có nhánh Nghiên cứu khoa học và mỗi node nội dung có 10–20 câu hỏi ôn tập', () => {
    const text = readFileSync(
      resolve(__dirname, '../../../docs/reference/unipark-mindmap-chi-tiet.umlab.json'),
      'utf8',
    );
    const p = parseImport(text);
    if (p.kind !== 'diagram') throw new Error('không phải sơ đồ');
    const d = normMindmap(p.file.diagram.data);
    const t = mindTree(d);
    const research = t.children(t.root.id).find((n) => n.title === 'Nghiên cứu khoa học');
    expect(research).toBeDefined();
    expect(t.subtree(research!.id).length).toBeGreaterThan(10);
    const qBranch = t.children(t.root.id).find((n) => n.title === 'Câu hỏi phản biện')!;
    const skip = new Set(t.subtree(qBranch.id));
    for (const n of d.nodes) {
      if (n.kind === 'question' || skip.has(n.id)) continue;
      const m = /~~~faq[^\n]*\n([\s\S]*?)\n~~~/.exec(n.detail);
      expect(m, n.id).not.toBeNull();
      const c = (m![1].match(/^Q:/gm) ?? []).length;
      expect(c, n.id).toBeGreaterThanOrEqual(10);
      expect(c, n.id).toBeLessThanOrEqual(20);
    }
  });
});
