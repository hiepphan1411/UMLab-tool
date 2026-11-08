// Hiển thị tài liệu ôn thi: Markdown (GFM) + cú pháp riêng cho học tiếng Anh.
//  Nội dòng:
//   {{word|/IPA/|nghĩa}}   → từ in đậm + phiên âm + nghĩa; bấm để nghe (có thể bỏ IPA: {{word|nghĩa}})
//   [[câu tiếng Anh]]       → câu bấm để nghe
//  Khối (rào ~~~loại Tiêu đề … ~~~):
//   say       mỗi dòng "English | Tiếng Việt" → câu mẫu có nút nghe + dịch
//   vocab     mỗi dòng "từ | /IPA/ | loại từ | nghĩa | ví dụ | dịch ví dụ" → bảng từ vựng
//   template  khung mẫu, [chỗ cần điền] được tô màu; nút chép
//   sample    bài mẫu (Markdown), phần dịch sau dòng "---" → nút đọc cả bài + bật/tắt bản dịch
//   dialog    lời thoại "Man: …"/"Woman: …" → nút nghe đổi giọng nam/nữ
//   tip / warn / note → hộp nhấn mạnh
import DOMPurify from 'dompurify';
import { Copy, Languages, Pause, Volume2 } from 'lucide-react';
import { Marked } from 'marked';
import { Fragment, memo, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { toast } from '@/ui';
import { sayNow, speak, speakScript, stopSpeaking, useSpeechPrefs } from './speech';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Đổi cú pháp nội dòng thành HTML (trước khi đưa qua marked). */
export function inlineTokens(src: string): string {
  return src
    .replace(/\{\{([^{}|]+)\|([^{}|]*)(?:\|([^{}]*))?\}\}/g, (_m, w: string, b: string, c?: string) => {
      const word = w.trim();
      let ipa = '';
      let mean = '';
      if (c !== undefined) {
        ipa = b.trim();
        mean = c.trim();
      } else if (b.trim().startsWith('/')) ipa = b.trim();
      else mean = b.trim();
      if (ipa && !ipa.startsWith('/')) ipa = `/${ipa}/`;
      return (
        `<span class="vw" data-say="${esc(word)}" role="button" tabindex="0"><b>${esc(word)}</b>` +
        (ipa ? `<span class="vw-ipa">${esc(ipa)}</span>` : '') +
        (mean ? `<span class="vw-mean">${esc(mean)}</span>` : '') +
        `</span>`
      );
    })
    .replace(
      /\[\[([^\]]+)\]\]/g,
      (_m, s: string) =>
        `<span class="vs" data-say="${esc(s.trim())}" role="button" tabindex="0">${esc(s.trim())}</span>`,
    );
}

/** Chữ thuần để đọc (bỏ cú pháp). */
export function plainText(src: string): string {
  return src
    .replace(/\{\{([^{}|]+)\|[^{}]*\}\}/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\[([^\]]*)\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const marked = new Marked({ gfm: true, breaks: false });

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-say', 'role', 'tabindex'],
    FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'input', 'script'],
  });
}

export function mdHtml(src: string): string {
  return sanitize(marked.parse(inlineTokens(src), { async: false }) as string);
}

export function mdInline(src: string): string {
  return sanitize(marked.parseInline(inlineTokens(src), { async: false }) as string);
}

const Html = ({ html, className, as = 'div' }: { html: string; className?: string; as?: 'div' | 'span' }) =>
  as === 'span' ? (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );

// ---------------- khối ----------------

interface Block {
  type: string;
  title: string;
  body: string;
}

function splitBlocks(src: string): (Block | string)[] {
  const out: (Block | string)[] = [];
  const re = /^~~~([a-z]+)[ \t]*(.*)\n([\s\S]*?)^~~~[ \t]*$/gm;
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m.index > last) out.push(src.slice(last, m.index));
    out.push({ type: m[1], title: m[2].trim(), body: m[3].replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

export function SpeakBtn({ text, label = 'Nghe', script }: { text: string; label?: string; script?: boolean }) {
  const [on, setOn] = useState(false);
  const cancel = useRef(false);
  useEffect(() => () => void (on && stopSpeaking()), [on]);
  const run = async (e: MouseEvent) => {
    e.stopPropagation();
    if (on) {
      cancel.current = true;
      stopSpeaking();
      setOn(false);
      return;
    }
    cancel.current = false;
    setOn(true);
    if (script) await speakScript(text, () => cancel.current);
    else {
      stopSpeaking();
      await speak(text);
    }
    setOn(false);
  };
  return (
    <button
      type="button"
      className={cn('vt-say', on && 'on')}
      onClick={(e) => void run(e)}
      aria-label={label}
      title={label}
    >
      {on ? <Pause size={13} /> : <Volume2 size={13} />}
    </button>
  );
}

function SayBlock({ b }: { b: Block }) {
  const rows = b.body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [en, ...vi] = l.split(' | ');
      return { en: en.trim(), vi: vi.join(' | ').trim() };
    });
  return (
    <div className="vt-say-block">
      {b.title && <div className="vt-block-title">{b.title}</div>}
      {rows.map((r, i) => (
        <div key={i} className="vt-say-row">
          <SpeakBtn text={plainText(r.en)} />
          <div>
            <Html as="span" className="vt-en" html={mdInline(r.en)} />
            {r.vi && <Html className="vt-vi" html={mdInline(r.vi)} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function VocabBlock({ b }: { b: Block }) {
  const rows = b.body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^[-| ]+$/.test(l))
    .map((l) => l.split('|').map((x) => x.trim()));
  const hasEx = rows.some((r) => r[4]);
  return (
    <div className="vt-vocab">
      {b.title && <div className="vt-block-title">{b.title}</div>}
      <table>
        <thead>
          <tr>
            <th style={{ width: 30 }} />
            <th>Từ</th>
            <th className="vt-col-ipa">Phiên âm</th>
            <th>Loại</th>
            <th>Nghĩa</th>
            {hasEx && <th>Ví dụ</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <SpeakBtn text={r[0]} />
              </td>
              <td>
                <b className="vt-word" data-say={r[0]}>
                  {r[0]}
                </b>
              </td>
              <td className="vt-col-ipa vt-ipa">{r[1] ? (r[1].startsWith('/') ? r[1] : `/${r[1]}/`) : ''}</td>
              <td className="text-muted">{r[2]}</td>
              <td>{r[3]}</td>
              {hasEx && (
                <td>
                  {r[4] && (
                    <span className="vs" data-say={plainText(r[4])} role="button" tabIndex={0}>
                      <Html as="span" html={mdInline(r[4])} />
                    </span>
                  )}
                  {r[5] && <div className="vt-vi">{r[5]}</div>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TemplateBlock({ b }: { b: Block }) {
  const html = esc(b.body)
    .replace(/\[([^\]\n]+)\]/g, '<span class="vt-slot">[$1]</span>')
    .replace(/\(([^)\n]*?(?:tuỳ chọn|optional)[^)\n]*)\)/gi, '<span class="vt-opt">($1)</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const copy = async () => {
    await navigator.clipboard.writeText(b.body.replace(/\*\*/g, ''));
    toast('Đã chép template');
  };
  return (
    <div className="vt-template">
      <div className="vt-block-head">
        <span className="vt-block-title">{b.title || 'Template'}</span>
        <SpeakBtn text={plainText(b.body.replace(/\[[^\]]*\]/g, ' '))} label="Nghe template" />
        <button type="button" className="vt-say" onClick={() => void copy()} aria-label="Chép" title="Chép">
          <Copy size={13} />
        </button>
      </div>
      <pre dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function SampleBlock({ b }: { b: Block }) {
  const [en, vi] = b.body.split(/^---[ \t]*$/m);
  const [showVi, setShowVi] = useState(false);
  return (
    <div className="vt-sample">
      <div className="vt-block-head">
        <span className="vt-block-title">{b.title || 'Bài mẫu'}</span>
        <SpeakBtn text={plainText(en)} label="Đọc cả bài" />
        {vi && (
          <button
            type="button"
            className={cn('vt-say', showVi && 'on')}
            onClick={() => setShowVi((v) => !v)}
            aria-label="Bản dịch"
            title="Bản dịch"
          >
            <Languages size={13} />
          </button>
        )}
      </div>
      <Html className="vt-md" html={mdHtml(en)} />
      {vi && showVi && <Html className="vt-md vt-sample-vi" html={mdHtml(vi)} />}
    </div>
  );
}

function DialogBlock({ b }: { b: Block }) {
  return (
    <div className="vt-dialog">
      <div className="vt-block-head">
        <span className="vt-block-title">{b.title || 'Hội thoại'}</span>
        <SpeakBtn text={b.body} script label="Nghe hội thoại" />
      </div>
      {b.body.split('\n').map((l, i) => {
        const m = /^([^:]{1,24}):\s*(.*)$/.exec(l);
        return m ? (
          <div key={i} className="vt-dl">
            <b>{m[1]}:</b> <Html as="span" html={mdInline(m[2])} />
          </div>
        ) : (
          <Html key={i} className="vt-dl" html={mdInline(l)} />
        );
      })}
    </div>
  );
}

const CALLOUT: Record<string, string> = { tip: 'Mẹo', warn: 'Lưu ý', note: 'Ghi nhớ' };

function renderBlock(b: Block, key: number): ReactNode {
  switch (b.type) {
    case 'say':
      return <SayBlock key={key} b={b} />;
    case 'vocab':
      return <VocabBlock key={key} b={b} />;
    case 'template':
      return <TemplateBlock key={key} b={b} />;
    case 'sample':
      return <SampleBlock key={key} b={b} />;
    case 'dialog':
      return <DialogBlock key={key} b={b} />;
    case 'tip':
    case 'warn':
    case 'note':
      return (
        <div key={key} className={cn('vt-callout', b.type)}>
          <div className="vt-block-title">{b.title || CALLOUT[b.type]}</div>
          <Html className="vt-md" html={mdHtml(b.body)} />
        </div>
      );
    default:
      return <Html key={key} className="vt-md" html={mdHtml('```\n' + b.body + '\n```')} />;
  }
}

/** Nội dung tài liệu; bấm vào từ/câu có gạch chân chấm để nghe. */
export const Rich = memo(function Rich({ src, className }: { src: string; className?: string }) {
  const { showIpa, showMeaning } = useSpeechPrefs();
  const parts = useMemo(() => splitBlocks(src), [src]);
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-say]');
    if (el?.dataset.say) sayNow(el.dataset.say);
  };
  return (
    <div
      className={cn('vt-rich', !showIpa && 'hide-ipa', !showMeaning && 'hide-mean', className)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const el = (e.target as HTMLElement).closest<HTMLElement>('[data-say]');
          if (el?.dataset.say) sayNow(el.dataset.say);
        }
      }}
    >
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <Html key={i} className="vt-md" html={mdHtml(p)} />
        ) : (
          <Fragment key={i}>{renderBlock(p, i)}</Fragment>
        ),
      )}
    </div>
  );
});
