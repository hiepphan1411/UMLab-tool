// Drawer kiến thức chi tiết của một node: đường dẫn, khái niệm, nội dung Markdown mở rộng, ý con, tài liệu tham khảo.
// Ở chế độ chưa khoá có thể sửa ngay trong drawer (tiêu đề, khái niệm, loại, màu, nhãn, tài liệu, nội dung + xem trước).
import { BookMarked, ChevronLeft, ChevronRight, ExternalLink, Pencil, X } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import {
  MIND_KINDS,
  mindColor,
  parseRefsText,
  refsToText,
  type MindKind,
  type MindmapData,
  type MindNode,
  type MindRef,
  type MindTree,
} from '@umlab/core';
import { Button, ColorField, Field, IconButton, Input, Segmented, Select, Textarea } from '@/ui';
import { Markdown } from './markdown';
import type { MindOps } from './ops';

export const KIND_TEXT: Record<MindKind, string> = {
  root: 'Trung tâm',
  branch: 'Nhánh chính',
  topic: 'Ý / khái niệm',
  question: 'Câu hỏi phản biện',
  note: 'Ghi chú / kết luận',
};

const HELP = `**Định dạng hỗ trợ**
- Bảng Markdown \`| a | b |\`, danh sách, **đậm**, *nghiêng*, ảnh \`![](url hoặc data:...)\`
- Công thức: \`$x^2$\` trong dòng, \`$$ ... $$\` hoặc khối \`\`\`math
- Khung công thức: khối \`\`\`formula với \`title:\`, \`tex:\`, dòng \`ký hiệu | ý nghĩa | đơn vị\`, \`note:\`
- Hình vẽ: khối \`\`\`svg Chú thích (dán mã SVG)
- Hộp nhấn mạnh: \`\`\`tip, \`\`\`warn, \`\`\`answer, \`\`\`key
- Câu hỏi ôn tập: khối \`\`\`faq với các dòng \`Q: câu hỏi\` và \`A: trả lời\` (gập/mở)
- Trích dẫn \`[23]\` → bấm để tới tài liệu tham khảo`;

function useCiteClick(root: React.RefObject<HTMLDivElement | null>) {
  return (e: RMouseEvent) => {
    const all = (e.target as HTMLElement).closest('.mm-faq-all') as HTMLButtonElement | null;
    if (all) {
      const ds = [...(all.closest('.mm-faq')?.querySelectorAll('details') ?? [])];
      const open = !ds.every((d) => d.open);
      ds.forEach((d) => (d.open = open));
      all.textContent = open ? 'Ẩn tất cả đáp án' : 'Mở tất cả đáp án';
      return;
    }
    const a = (e.target as HTMLElement).closest('.mm-cite') as HTMLElement | null;
    if (!a) return;
    e.preventDefault();
    const el = root.current?.querySelector(`#mm-ref-${a.dataset.ref}`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  };
}

function RefList({ refs, all }: { refs: number[]; all: MindRef[] }) {
  const items = refs.map((id) => all.find((r) => r.id === id) ?? { id, text: '(chưa có trong danh sách tài liệu)' });
  if (!items.length) return null;
  return (
    <section className="mm-refs">
      <h4>
        <BookMarked size={14} /> Tài liệu tham khảo
      </h4>
      <ol>
        {items.map((r) => (
          <li key={r.id} id={`mm-ref-${r.id}`}>
            <span className="mm-ref-n">[{r.id}]</span>
            <span>
              {r.text}
              {'url' in r && r.url && (
                <a href={r.url} target="_blank" rel="noreferrer" className="mm-ref-link">
                  <ExternalLink size={12} /> {r.url.replace(/^https?:\/\//, '').slice(0, 60)}
                </a>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function NodeEditor({ n, d, ops, onDone }: { n: MindNode; d: MindmapData; ops: MindOps; onDone: () => void }) {
  const [f, setF] = useState(() => ({
    title: n.title,
    summary: n.summary,
    detail: n.detail,
    kind: n.kind,
    color: n.color,
    tags: n.tags.join(', '),
    refs: n.refs.join(', '),
  }));
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }));
  const save = () => {
    ops.setNode(n.id, {
      title: f.title.trim(),
      summary: f.summary,
      detail: f.detail,
      kind: n.kind === 'root' ? 'root' : f.kind,
      color: f.color,
      tags: f.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      refs: f.refs
        .split(/[,;\s]+/)
        .map((s) => Number(s.replace(/[^\d]/g, '')))
        .filter((x) => Number.isFinite(x) && x > 0),
    });
    onDone();
  };
  return (
    <div
      className="mm-edit"
      onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 's' && (e.preventDefault(), save())}
    >
      <Field label="Tiêu đề">
        <Input value={f.title} autoFocus onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Khái niệm ngắn (hiện trên sơ đồ)">
        <Textarea rows={2} value={f.summary} onChange={(e) => set('summary', e.target.value)} />
      </Field>
      <div className="mm-edit-row">
        {n.kind !== 'root' && (
          <Field label="Loại node">
            <Select
              value={f.kind}
              onChange={(e) => set('kind', e.target.value as MindKind)}
              options={MIND_KINDS.filter((k) => k !== 'root').map((k) => ({ value: k, label: KIND_TEXT[k] }))}
            />
          </Field>
        )}
        <Field label="Màu nhánh">
          <div className="flex items-center gap-2">
            <ColorField value={f.color ?? '#2E62E6'} onChange={(v) => set('color', v)} />
            {f.color && (
              <Button size="sm" variant="ghost" onClick={() => set('color', null)}>
                Tự động
              </Button>
            )}
          </div>
        </Field>
      </div>
      <div className="mm-edit-row">
        <Field label="Tài liệu tham khảo (số, cách nhau dấu phẩy)">
          <Input value={f.refs} placeholder="vd. 23, 24" onChange={(e) => set('refs', e.target.value)} />
        </Field>
        <Field label="Nhãn">
          <Input value={f.tags} placeholder="vd. AI, công thức" onChange={(e) => set('tags', e.target.value)} />
        </Field>
      </div>
      <div className="mm-edit-tabs">
        <Segmented
          ariaLabel="Nội dung chi tiết"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'edit', label: 'Soạn nội dung' },
            { value: 'preview', label: 'Xem trước' },
          ]}
        />
      </div>
      {tab === 'edit' ? (
        <>
          <Textarea
            className="mm-src"
            rows={18}
            value={f.detail}
            spellCheck={false}
            onChange={(e) => set('detail', e.target.value)}
          />
          <Markdown src={HELP} className="mm-help" />
        </>
      ) : (
        <Markdown src={f.detail || '_Chưa có nội dung._'} />
      )}
      <div className="mm-edit-foot">
        <span className="text-muted" style={{ fontSize: 12 }}>
          {d.references.length} tài liệu trong danh sách · Ctrl+S để lưu
        </span>
        <Button variant="ghost" onClick={onDone}>
          Huỷ
        </Button>
        <Button variant="primary" onClick={save}>
          Lưu
        </Button>
      </div>
    </div>
  );
}

function RefsPanel({ d, ops, locked }: { d: MindmapData; ops: MindOps; locked: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  return (
    <div className="mm-drawer-body">
      <div className="mm-kind">Danh sách dùng chung</div>
      <h2 className="mm-title">Tài liệu tham khảo</h2>
      {editing ? (
        <>
          <p className="text-muted" style={{ fontSize: 12.5, margin: '6px 0' }}>
            Mỗi dòng một mục dạng <code>[n] nội dung &lt;url&gt;</code> - có thể dán nguyên mục "Tài liệu tham khảo" của
            báo cáo.
          </p>
          <Textarea className="mm-src" rows={22} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mm-edit-foot">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Huỷ
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                ops.setMeta({ references: parseRefsText(text) });
                setEditing(false);
              }}
            >
              Lưu
            </Button>
          </div>
        </>
      ) : (
        <>
          {!locked && (
            <Button
              size="sm"
              variant="outline"
              icon={<Pencil />}
              onClick={() => {
                setText(refsToText(d.references));
                setEditing(true);
              }}
            >
              Sửa danh sách
            </Button>
          )}
          <RefList refs={d.references.map((r) => r.id)} all={d.references} />
          {!d.references.length && <p className="text-muted">Chưa có tài liệu nào.</p>}
        </>
      )}
    </div>
  );
}

export function MindDrawer({
  d,
  t,
  target,
  locked,
  ops,
  width,
  onWidth,
  onClose,
  onNavigate,
}: {
  d: MindmapData;
  t: MindTree;
  target: string;
  locked: boolean;
  ops: MindOps;
  width: number;
  onWidth: (w: number) => void;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const onCite = useCiteClick(body);
  const n = target === 'refs' ? null : t.byId.get(target);
  useEffect(() => {
    setEditing(false);
    body.current?.scrollTo({ top: 0 });
  }, [target]);
  useEffect(() => {
    if (locked) setEditing(false);
  }, [locked]);

  const resize = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = width;
    const move = (ev: PointerEvent) => onWidth(Math.max(380, Math.min(window.innerWidth - 240, w0 + x0 - ev.clientX)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const header = (
    <div className="mm-drawer-head">
      {n ? (
        <nav className="mm-crumbs" aria-label="Đường dẫn">
          {t.path(n.id).map((p) => (
            <button key={p.id} type="button" onClick={() => onNavigate(p.id)}>
              {p.title || 'Chưa đặt tên'}
            </button>
          ))}
        </nav>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-1">
        {n && n.parentId && (
          <>
            <IconButton
              label="Ý trước"
              size="sm"
              onClick={() => {
                const s = t.children(n.parentId!);
                const i = s.findIndex((x) => x.id === n.id);
                if (i > 0) onNavigate(s[i - 1].id);
              }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              label="Ý sau"
              size="sm"
              onClick={() => {
                const s = t.children(n.parentId!);
                const i = s.findIndex((x) => x.id === n.id);
                if (i >= 0 && i < s.length - 1) onNavigate(s[i + 1].id);
              }}
            >
              <ChevronRight />
            </IconButton>
          </>
        )}
        {n && !locked && !editing && (
          <IconButton label="Sửa nội dung" size="sm" onClick={() => setEditing(true)}>
            <Pencil />
          </IconButton>
        )}
        <IconButton label="Đóng (Esc)" size="sm" onClick={onClose}>
          <X />
        </IconButton>
      </div>
    </div>
  );

  return (
    <aside className="mm-drawer" style={{ width }} aria-label="Kiến thức chi tiết">
      <div className="mm-drawer-grip" onPointerDown={resize} />
      {header}
      <div className="mm-drawer-scroll" ref={body} onClick={onCite}>
        {!n ? (
          <RefsPanel d={d} ops={ops} locked={locked} />
        ) : editing ? (
          <div className="mm-drawer-body">
            <NodeEditor key={n.id} n={n} d={d} ops={ops} onDone={() => setEditing(false)} />
          </div>
        ) : (
          <div className="mm-drawer-body" style={{ ['--mm-c' as string]: mindColor(t, n.id) }}>
            <div className="mm-kind">
              <i />
              {KIND_TEXT[n.kind]}
              {n.tags.map((g) => (
                <span key={g} className="mm-tag">
                  {g}
                </span>
              ))}
            </div>
            <h2 className="mm-title">{n.title || 'Chưa đặt tên'}</h2>
            {n.summary.trim() && <p className="mm-summary">{n.summary}</p>}
            {n.detail.trim() ? (
              <Markdown src={n.detail} />
            ) : (
              <p className="text-muted" style={{ fontSize: 13 }}>
                Chưa có nội dung chi tiết{!locked && ' - bấm biểu tượng bút để soạn'}.
              </p>
            )}
            {t.children(n.id).length > 0 && (
              <section className="mm-kids">
                <h4>Ý liên quan</h4>
                <div>
                  {t.children(n.id).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={'mm-chip' + (c.kind === 'question' ? ' q' : '')}
                      onClick={() => onNavigate(c.id)}
                    >
                      {c.kind === 'question' && <b>?</b>}
                      {c.title || 'Chưa đặt tên'}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <RefList refs={n.refs} all={d.references} />
          </div>
        )}
      </div>
    </aside>
  );
}
