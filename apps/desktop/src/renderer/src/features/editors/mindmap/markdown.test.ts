import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { normMindmap } from '@umlab/core';

// Môi trường test không có DOM: thay DOMPurify bằng hàm giữ nguyên (chỉ kiểm phần dựng HTML của marked + KaTeX).
vi.mock('dompurify', () => ({ default: { sanitize: (s: string) => s, addHook: () => {} } }));
vi.mock('katex/dist/katex.min.css', () => ({}));

const { renderMarkdown, parseFaq } = await import('./markdown');

describe('Markdown mở rộng của mindmap', () => {
  it('bảng, công thức, khung công thức, hình SVG, hộp, trích dẫn', () => {
    const html = renderMarkdown(
      [
        '| a | b |',
        '|---|---|',
        '| $x^2$ | 2 |',
        '',
        'Xem [23, tr. 32] và $\\theta$.',
        '',
        '~~~formula',
        'title: PDI',
        'tex: \\mathrm{PDI} = \\max(a, b)',
        '\\theta | góc | độ',
        'note: ghi chú',
        '~~~',
        '',
        '~~~svg Hình 1',
        '<svg viewBox="0 0 10 10"><rect width="5" height="5"/></svg>',
        '~~~',
        '',
        '~~~answer',
        '**Đúng**',
        '~~~',
      ].join('\n'),
    );
    expect(html).toContain('<table>');
    expect(html).toContain('class="katex"');
    expect(html).toContain('mm-formula');
    expect(html).toContain('mm-vars');
    expect(html).toContain('<svg viewBox');
    expect(html).toContain('<figcaption>Hình 1</figcaption>');
    expect(html).toContain('mm-box-answer');
    expect(html).toContain('data-ref="23"');
    expect(html).not.toContain('mm-err');
  });

  it('khối câu hỏi ôn tập: Q/A nhiều dòng, đánh số, nút mở tất cả', () => {
    expect(parseFaq(['Q: Một?', 'A: **Có**', 'thêm dòng', 'Q: Hai', 'dài?', 'A: Không'].join('\n'))).toEqual([
      { q: 'Một?', a: '**Có**\nthêm dòng' },
      { q: 'Hai dài?', a: 'Không' },
    ]);
    const html = renderMarkdown(
      ['~~~faq Ôn tập', 'Q: Vì sao $x$?', 'A: Vì [23].', 'Q: Hai?', 'A: Ừ', '~~~'].join('\n'),
    );
    expect(html).toContain('mm-faq-all');
    expect(html).toContain('<details>');
    expect(html).toContain('2 câu');
    expect(html).toContain('class="katex"');
    expect(html).toContain('data-ref="23"');
  });

  it.each(['unipark-mindmap.umlab.json', 'unipark-mindmap-chi-tiet.umlab.json'])(
    'dựng được toàn bộ nội dung %s không lỗi',
    (file) => {
      const f = JSON.parse(
        readFileSync(resolve(__dirname, '../../../../../../../../docs/reference/' + file), 'utf8'),
      ) as { diagram: { data: unknown } };
      const d = normMindmap(f.diagram.data);
      let figs = 0;
      for (const n of d.nodes) {
        const html = renderMarkdown(n.detail);
        expect(html, n.id).not.toContain('mm-err');
        expect(html, n.id).not.toContain('katex-error');
        expect(html, n.id).not.toContain('~~~');
        figs += (html.match(/class="mm-figure"/g) ?? []).length;
      }
      expect(figs).toBeGreaterThanOrEqual(15);
    },
  );
});
