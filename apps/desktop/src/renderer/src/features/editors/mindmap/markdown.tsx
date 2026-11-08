// Markdown mở rộng cho nội dung chi tiết node:
//  - GFM: tiêu đề, danh sách, bảng, trích dẫn, ảnh (kể cả data:), liên kết (mở trình duyệt ngoài)
//  - $...$ và $$...$$ hoặc khối ```math → KaTeX
//  - ```formula → "khung công thức": tiêu đề, một/many dòng `tex:`, bảng đại lượng `ký hiệu | ý nghĩa | đơn vị`, `note:`
//  - ```svg Chú thích hình → hình vẽ SVG nội tuyến (đã lọc script / sự kiện)
//  - ```tip / ```warn / ```note / ```answer / ```question → hộp nhấn mạnh (nội dung là Markdown)
//  - [23] hoặc [23, tr. 32] → trích dẫn, bấm để nhảy tới mục tài liệu tham khảo
import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Marked, type Tokens } from 'marked';
import { memo, useMemo } from 'react';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function tex(src: string, display: boolean): string {
  // chữ tiếng Việt trong \text{} không có bảng đo của font KaTeX → KaTeX cảnh báo dù vẫn vẽ đúng bằng font dự phòng
  const warn = console.warn;
  console.warn = (...a: unknown[]) => {
    if (typeof a[0] === 'string' && a[0].startsWith('No character metrics')) return;
    warn(...a);
  };
  try {
    return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'html' });
  } catch (e) {
    return `<code class="mm-err">${esc(e instanceof Error ? e.message : String(e))}</code>`;
  } finally {
    console.warn = warn;
  }
}

const BOX: Record<string, string> = {
  tip: 'Gợi ý',
  note: 'Ghi chú',
  warn: 'Lưu ý',
  answer: 'Gợi ý trả lời',
  question: 'Câu hỏi',
  key: 'Ý chính',
};

function formulaBlock(src: string, md: (s: string) => string): string {
  let title = '';
  const texs: string[] = [];
  const notes: string[] = [];
  const rows: string[][] = [];
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const kv = /^(title|tex|note)\s*:\s*(.*)$/i.exec(line);
    if (kv) {
      const k = kv[1].toLowerCase();
      if (k === 'title') title = kv[2];
      else if (k === 'tex') texs.push(kv[2]);
      else notes.push(kv[2]);
    } else if (line.includes('|')) rows.push(line.split('|').map((c) => c.trim()));
    else texs.push(line);
  }
  const unit = rows.some((r) => r.length > 2 && r[2]);
  return (
    `<figure class="mm-formula">` +
    (title ? `<figcaption>${md(title)}</figcaption>` : '') +
    `<div class="mm-formula-body">${texs.map((t) => `<div class="mm-tex">${tex(t, true)}</div>`).join('')}</div>` +
    (rows.length
      ? `<table class="mm-vars"><thead><tr><th>Đại lượng</th><th>Ý nghĩa</th>${unit ? '<th>Đơn vị / miền</th>' : ''}</tr></thead><tbody>` +
        rows
          .map(
            (r) =>
              `<tr><td class="sym">${tex(r[0] ?? '', false)}</td><td>${md(r[1] ?? '')}</td>${unit ? `<td>${md(r[2] ?? '')}</td>` : ''}</tr>`,
          )
          .join('') +
        `</tbody></table>`
      : '') +
    notes.map((n) => `<p class="mm-formula-note">${md(n)}</p>`).join('') +
    `</figure>`
  );
}

/** Khối ```faq: dòng "Q:" mở câu hỏi, "A:" mở câu trả lời (Markdown, có thể nhiều dòng). */
export function parseFaq(src: string): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  let cur: { q: string; a: string } | null = null;
  let part: 'q' | 'a' = 'q';
  for (const line of src.split(/\r?\n/)) {
    const mq = /^\s*(?:Q|H)\s*[:.]\s*(.*)$/.exec(line);
    const ma = /^\s*(?:A|Đ|TL)\s*[:.]\s*(.*)$/.exec(line);
    if (mq) {
      cur = { q: mq[1], a: '' };
      out.push(cur);
      part = 'q';
    } else if (ma && cur) {
      cur.a = ma[1];
      part = 'a';
    } else if (cur) {
      if (part === 'q') cur.q += (cur.q ? ' ' : '') + line.trim();
      else cur.a += '\n' + line;
    }
  }
  return out.filter((x) => x.q.trim());
}

function faqBlock(src: string, title: string, m: Marked): string {
  const items = parseFaq(src);
  return (
    `<section class="mm-faq"><div class="mm-faq-h"><span>${esc(title || 'Câu hỏi ôn tập')} <b>${items.length} câu</b></span>` +
    `<button type="button" class="mm-faq-all">Mở tất cả đáp án</button></div><ol>` +
    items
      .map(
        (it, i) =>
          `<li><details><summary><span class="mm-faq-n">${i + 1}</span><span class="mm-faq-q">${m.parseInline(it.q.trim()) as string}</span></summary>` +
          `<div class="mm-faq-a">${m.parse(it.a.trim() || '_Chưa có trả lời._') as string}</div></details></li>`,
      )
      .join('') +
    `</ol></section>`
  );
}

function makeMarked(): Marked {
  const m = new Marked({ gfm: true, breaks: false });
  const inline = (s: string) => m.parseInline(s) as string;
  m.use({
    extensions: [
      {
        name: 'mathBlock',
        level: 'block',
        start: (src: string) => src.indexOf('$$'),
        tokenizer(src: string) {
          const r = /^\$\$([\s\S]+?)\$\$(?:\n|$)/.exec(src);
          if (r) return { type: 'mathBlock', raw: r[0], text: r[1].trim() };
          return undefined;
        },
        renderer: (t) => `<div class="mm-tex">${tex((t as Tokens.Generic).text as string, true)}</div>`,
      },
      {
        name: 'mathInline',
        level: 'inline',
        start: (src: string) => src.indexOf('$'),
        tokenizer(src: string) {
          const r = /^\$(?!\s)((?:\\\$|[^$\n])+?)\$(?!\d)/.exec(src);
          if (r) return { type: 'mathInline', raw: r[0], text: r[1] };
          return undefined;
        },
        renderer: (t) => tex((t as Tokens.Generic).text as string, false),
      },
      {
        name: 'cite',
        level: 'inline',
        start: (src: string) => src.search(/\[\d/),
        tokenizer(src: string) {
          const r = /^\[(\d+(?:\s*[,–-]\s*\d+)*)((?:\s*,\s*(?:tr|ch|pp|p)\.?[^\]]*))?\](?!\()/.exec(src);
          if (r) return { type: 'cite', raw: r[0], ids: r[1], extra: r[2] ?? '' };
          return undefined;
        },
        renderer: (t) => {
          const g = t as Tokens.Generic;
          const ids = String(g.ids)
            .split(/\s*,\s*/)
            .map((p) => p.trim());
          return (
            '[' +
            ids.map((id) => `<a class="mm-cite" data-ref="${esc(id.split(/[–-]/)[0])}">${esc(id)}</a>`).join(', ') +
            esc(String(g.extra)) +
            ']'
          );
        },
      },
    ],
    renderer: {
      code({ text, lang }: Tokens.Code) {
        const info = (lang ?? '').trim();
        const kind = info.split(/\s+/)[0].toLowerCase();
        const rest = info.slice(kind.length).trim();
        if (kind === 'math' || kind === 'latex' || kind === 'tex')
          return text
            .split(/\n\s*\n/)
            .map((p) => `<div class="mm-tex">${tex(p, true)}</div>`)
            .join('');
        if (kind === 'formula') return formulaBlock(text, inline);
        if (kind === 'faq') return faqBlock(text, rest, m);
        if (kind === 'svg')
          return `<figure class="mm-figure"><div class="mm-svg">${text}</div>${rest ? `<figcaption>${inline(rest)}</figcaption>` : ''}</figure>`;
        if (BOX[kind])
          return `<div class="mm-box mm-box-${kind}"><div class="mm-box-h">${rest ? inline(rest) : BOX[kind]}</div>${m.parse(text) as string}</div>`;
        return `<pre class="mm-code"><code>${esc(text)}</code></pre>`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const body = this.parser.parseInline(tokens);
        return `<a href="${esc(href)}" target="_blank" rel="noreferrer"${title ? ` title="${esc(title)}"` : ''}>${body}</a>`;
      },
      table(token: Tokens.Table) {
        const head = token.header
          .map(
            (c, i) =>
              `<th${token.align[i] ? ` style="text-align:${token.align[i]}"` : ''}>${this.parser.parseInline(c.tokens)}</th>`,
          )
          .join('');
        const body = token.rows
          .map(
            (r) =>
              `<tr>${r.map((c, i) => `<td${token.align[i] ? ` style="text-align:${token.align[i]}"` : ''}>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`,
          )
          .join('');
        return `<div class="mm-table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
      },
    },
  });
  return m;
}

let marked: Marked | null = null;
let hooked = false;

export function renderMarkdown(src: string): string {
  if (!marked) marked = makeMarked();
  if (!hooked) {
    hooked = true;
    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
      if (data.tagName === 'script' || data.tagName === 'foreignobject') node.parentNode?.removeChild(node);
    });
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.getAttribute('href')) {
        const href = node.getAttribute('href') ?? '';
        if (!/^https?:\/\//i.test(href)) node.removeAttribute('href');
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noreferrer');
      }
    });
  }
  const html = marked.parse(src ?? '', { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
    ADD_ATTR: ['target', 'data-ref', 'aria-hidden'],
    FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'input'],
  });
}

export const Markdown = memo(function Markdown({ src, className }: { src: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(src), [src]);
  return <div className={'mm-md ' + (className ?? '')} dangerouslySetInnerHTML={{ __html: html }} />;
});
