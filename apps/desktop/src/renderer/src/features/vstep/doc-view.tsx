import { Check, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/cn';
import { umlab } from '@/lib/api';
import { Button, toast } from '@/ui';
import { Bar, completeLink } from './common';
import { DOCS, docSections, sectionKey } from './content';
import { toPlainMarkdown } from './content/mindmap';
import type { DocId } from './content/types';
import { Rich } from './rich';
import { useVstep } from './store';

/** Tài liệu dạng báo cáo: mục lục bên trái, một mục mỗi lần bên phải, đánh dấu "Đã học". */
export function DocView({
  id,
  section,
  onSection,
}: {
  id: DocId;
  section: string | null;
  onSection: (s: string) => void;
}) {
  const doc = DOCS[id];
  const secs = useMemo(() => docSections(doc), [doc]);
  const learned = useVstep((s) => s.state!.learned);
  const cur = secs.find((s) => s.id === section) ?? secs[0];
  const idx = secs.indexOf(cur);
  const body = useRef<HTMLDivElement>(null);
  const done = secs.filter((s) => learned[sectionKey(id, s.id)]).length;
  useEffect(() => body.current?.scrollTo({ top: 0 }), [cur.id]);

  const isDone = !!learned[sectionKey(id, cur.id)];
  const toggle = () =>
    useVstep.getState().update((s) => {
      const k = sectionKey(id, cur.id);
      if (s.learned[k]) delete s.learned[k];
      else {
        s.learned[k] = Date.now();
        completeLink(s, `doc:${id}#${cur.id}`);
      }
    });

  const exportMd = async () => {
    const NL2 = '\n\n';
    const md =
      `# ${doc.title}${NL2}_${doc.subtitle}_${NL2}` +
      doc.parts
        .map(
          (p) =>
            `## ${p.title}${NL2}` + p.sections.map((x) => `### ${x.title}${NL2}${toPlainMarkdown(x.body)}`).join(NL2),
        )
        .join(NL2);
    const path = await umlab.files.save({
      defaultName: `vstep-${id}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      data: md,
    });
    if (path) toast('Đã xuất tài liệu');
  };

  return (
    <div className="vs-doc">
      <aside className="vs-toc">
        <div className="vs-toc-head">
          <b>{doc.title}</b>
          <span className="text-muted">
            {done}/{secs.length} mục đã học
          </span>
          <Bar value={done} max={secs.length} />
          <Button size="sm" variant="outline" icon={<FileDown />} className="mt-2" onClick={() => void exportMd()}>
            Xuất Markdown
          </Button>
        </div>
        {doc.parts.map((p) => (
          <div key={p.id} className="vs-toc-part">
            <div className="vs-toc-pt">{p.title}</div>
            {p.sections.map((s) => (
              <button key={s.id} className={cn('vs-toc-item', s.id === cur.id && 'on')} onClick={() => onSection(s.id)}>
                <span className={cn('vs-toc-ck', learned[sectionKey(id, s.id)] && 'done')}>
                  {learned[sectionKey(id, s.id)] && <Check size={10} strokeWidth={3} />}
                </span>
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
      <article className="vs-doc-body" ref={body}>
        <div className="vs-doc-inner">
          <div className="vs-doc-crumb">{doc.parts.find((p) => p.sections.includes(cur))?.title}</div>
          <h1 className="vs-doc-h1">{cur.title}</h1>
          <Rich src={cur.body} />
          <div className="vs-doc-foot">
            <Button
              variant="outline"
              icon={<ChevronLeft />}
              disabled={idx <= 0}
              onClick={() => onSection(secs[idx - 1].id)}
            >
              Mục trước
            </Button>
            <Button variant={isDone ? 'outline' : 'primary'} icon={<Check />} onClick={toggle}>
              {isDone ? 'Đã học (bấm để bỏ)' : 'Đánh dấu đã học'}
            </Button>
            <Button variant="outline" disabled={idx >= secs.length - 1} onClick={() => onSection(secs[idx + 1].id)}>
              Mục sau
              <ChevronRight />
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}
