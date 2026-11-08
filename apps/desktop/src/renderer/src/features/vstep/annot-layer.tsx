// Lớp vẽ + ghi chú phủ lên một trang (ảnh trang sách hoặc trang PDF). Đặt trong khung position: relative cùng kích
// thước với trang. Công cụ đang chọn lấy từ useAnnots (thanh AnnotToolbar dùng chung).
import { Eraser, Highlighter, MousePointer2, PenLine, ScanText, StickyNote, Trash2, Undo2 } from 'lucide-react';
import { ExtractPopup, type Region } from './extract';
import { getStroke } from 'perfect-freehand';
import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/lib/cn';
import { IconButton, confirmDialog } from '@/ui';
import { ANNOT_COLORS, useAnnots, type AnnotTool, type PageNote, type Stroke } from './annots';
import { uid } from './store';

const K = 10000;

function pathOf(s: Stroke, W: number, H: number): string {
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < s.p.length; i += 2) pts.push([(s.p[i] / K) * W, (s.p[i + 1] / K) * H]);
  const size = (s.w / 1000) * W * (s.h ? 5 : 1.6);
  const o = getStroke(pts, {
    size,
    thinning: s.h ? 0 : 0.55,
    smoothing: 0.6,
    streamline: 0.5,
    simulatePressure: !s.h,
    last: true,
  });
  if (!o.length) return '';
  const d = o.reduce<string[]>((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    acc.push(`${x0.toFixed(1)},${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)},${((y0 + y1) / 2).toFixed(1)}`);
    return acc;
  }, []);
  return `M${d[0].split(' ')[0]} Q${d.join(' ')} Z`;
}

function NoteBubble({ n, onChange, onDelete }: { n: PageNote; onChange: (t: string) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(!n.t);
  const [text, setText] = useState(n.t);
  return (
    <div
      className={cn('an-note', open && 'open')}
      style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%`, ['--nc' as string]: n.c }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button className="an-pin" onClick={() => setOpen((o) => !o)} aria-label="Ghi chú" title={n.t || 'Ghi chú'}>
        <StickyNote size={14} />
      </button>
      {open && (
        <div className="an-pop">
          <textarea
            autoFocus
            value={text}
            placeholder="Ghi chú, câu hỏi, mẹo…"
            onChange={(e) => setText(e.target.value)}
            onBlur={() => onChange(text)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onChange(text);
                setOpen(false);
              }
            }}
          />
          <div className="an-pop-foot">
            <button className="ibtn" onClick={onDelete} aria-label="Xoá ghi chú" title="Xoá ghi chú">
              <Trash2 size={13} />
            </button>
            <button className="btn sm" onClick={() => (onChange(text), setOpen(false))}>
              Xong
            </button>
          </div>
        </div>
      )}
      {!open && n.t && <div className="an-preview">{n.t}</div>}
    </div>
  );
}

/** Phủ lên trang. `aspect` = cao / rộng của trang. */
export function AnnotLayer({
  pageKey,
  aspect,
  extract,
}: {
  pageKey: string;
  aspect: number;
  /** Lấy chữ trong vùng (toạ độ 0–1 theo trang). Không truyền = trang này không hỗ trợ. */
  extract?: (r: Region) => Promise<string>;
}) {
  const { tool, color, size } = useAnnots();
  const page = useAnnots((s) => s.data?.pages[pageKey]);
  const setPage = useAnnots((s) => s.setPage);
  const svg = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const W = 1000;
  const H = Math.round(1000 * aspect);
  const strokes = useMemo(() => page?.s ?? [], [page]);
  const notes = page?.n ?? [];
  const paths = useMemo(() => strokes.map((s) => pathOf(s, W, H)), [strokes, H]);

  const pos = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return [
      Math.round(((e.clientX - r.left) / r.width) * K),
      Math.round(((e.clientY - r.top) / r.height) * K),
    ] as const;
  };
  const eraseAt = (x: number, y: number) => {
    const rad = 140;
    const keep = strokes.filter((s) => {
      for (let i = 0; i + 1 < s.p.length; i += 2)
        if (Math.abs(s.p[i] - x) < rad && Math.abs(s.p[i + 1] - y) < rad) return false;
      return true;
    });
    if (keep.length !== strokes.length) setPage(pageKey, (p) => ({ ...p, s: keep }));
  };

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (tool === 'none' || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    if (tool === 'note') {
      setPage(pageKey, (p) => ({
        ...p,
        n: [...p.n, { id: uid(), x: x / K, y: y / K, t: '', c: color, at: Date.now() }],
      }));
      return;
    }
    if (tool === 'erase') return eraseAt(x, y);
    if (tool === 'ocr') {
      if (!extract) return;
      setRegion(null);
      return setBox({ x0: x, y0: y, x1: x, y1: y });
    }
    setDraft({ c: color, w: size, ...(tool === 'hl' ? { h: 1 as const } : {}), p: [x, y] });
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (tool === 'erase' && e.buttons === 1) {
      const [x, y] = pos(e);
      return eraseAt(x, y);
    }
    if (box) {
      const [x, y] = pos(e);
      return setBox({ ...box, x1: x, y1: y });
    }
    if (!draft) return;
    const [x, y] = pos(e);
    const n = draft.p.length;
    if (Math.abs(draft.p[n - 2] - x) + Math.abs(draft.p[n - 1] - y) < 12) return;
    setDraft({ ...draft, p: [...draft.p, x, y] });
  };
  const up = () => {
    if (box) {
      const r = {
        x: Math.min(box.x0, box.x1) / K,
        y: Math.min(box.y0, box.y1) / K,
        w: Math.abs(box.x1 - box.x0) / K,
        h: Math.abs(box.y1 - box.y0) / K,
      };
      setBox(null);
      if (r.w > 0.01 && r.h > 0.008) setRegion(r);
      return;
    }
    if (draft && draft.p.length >= 4) setPage(pageKey, (p) => ({ ...p, s: [...p.s, draft] }));
    setDraft(null);
  };

  return (
    <div className={cn('an-layer', tool !== 'none' && 'active', `tool-${tool}`)}>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {strokes.map((s, i) => (
          <path key={i} d={paths[i]} fill={s.c} opacity={s.h ? 0.32 : 0.92} />
        ))}
        {draft && <path d={pathOf(draft, W, H)} fill={draft.c} opacity={draft.h ? 0.32 : 0.92} />}
        {(box || region) && (
          <rect
            className="an-sel"
            x={box ? (Math.min(box.x0, box.x1) / K) * W : region!.x * W}
            y={box ? (Math.min(box.y0, box.y1) / K) * H : region!.y * H}
            width={box ? (Math.abs(box.x1 - box.x0) / K) * W : region!.w * W}
            height={box ? (Math.abs(box.y1 - box.y0) / K) * H : region!.h * H}
          />
        )}
      </svg>
      {region && extract && <ExtractPopup region={region} extract={extract} onClose={() => setRegion(null)} />}
      {notes.map((n) => (
        <NoteBubble
          key={n.id}
          n={n}
          onChange={(t) =>
            setPage(pageKey, (p) => ({ ...p, n: p.n.map((x) => (x.id === n.id ? { ...x, t, at: Date.now() } : x)) }))
          }
          onDelete={() => setPage(pageKey, (p) => ({ ...p, n: p.n.filter((x) => x.id !== n.id) }))}
        />
      ))}
    </div>
  );
}

const TOOLS: { id: AnnotTool; label: string; icon: React.ReactNode }[] = [
  { id: 'none', label: 'Con trỏ (xem, cuộn trang)', icon: <MousePointer2 size={15} /> },
  { id: 'pen', label: 'Bút vẽ', icon: <PenLine size={15} /> },
  { id: 'hl', label: 'Bút dạ quang', icon: <Highlighter size={15} /> },
  { id: 'note', label: 'Ghi chú (bấm vào trang để thêm)', icon: <StickyNote size={15} /> },
  { id: 'erase', label: 'Tẩy (kéo qua nét vẽ)', icon: <Eraser size={15} /> },
  { id: 'ocr', label: 'Chọn vùng lấy chữ (chép, dịch, IPA)', icon: <ScanText size={15} /> },
];

/** Thanh công cụ vẽ/ghi chú cho trang `pageKey`. */
export function AnnotToolbar({ pageKey }: { pageKey: string }) {
  const { tool, color, size, setTool } = useAnnots();
  const setPage = useAnnots((s) => s.setPage);
  const has = useAnnots((s) => !!s.data?.pages[pageKey]);
  return (
    <div className="an-tools" role="toolbar" aria-label="Vẽ và ghi chú">
      {TOOLS.map((t) => (
        <IconButton key={t.id} label={t.label} size="sm" active={tool === t.id} onClick={() => setTool({ tool: t.id })}>
          {t.icon}
        </IconButton>
      ))}
      <span className="an-sep" />
      {ANNOT_COLORS.map((c) => (
        <button
          key={c}
          className={cn('an-color', color === c && 'on')}
          style={{ background: c }}
          aria-label={`Màu ${c}`}
          onClick={() => setTool({ color: c, tool: tool === 'none' || tool === 'erase' ? 'pen' : tool })}
        />
      ))}
      <span className="an-sep" />
      {[2, 3, 5].map((w) => (
        <button
          key={w}
          className={cn('an-size', size === w && 'on')}
          aria-label={`Nét ${w}`}
          title={`Nét ${w}`}
          onClick={() => setTool({ size: w })}
        >
          <i style={{ width: w * 2, height: w * 2 }} />
        </button>
      ))}
      <span className="an-sep" />
      <IconButton
        label="Hoàn tác nét vẽ cuối"
        size="sm"
        disabled={!has}
        onClick={() => setPage(pageKey, (p) => ({ ...p, s: p.s.slice(0, -1) }))}
      >
        <Undo2 size={15} />
      </IconButton>
      <IconButton
        label="Xoá hết nét vẽ + ghi chú trang này"
        size="sm"
        disabled={!has}
        onClick={async () => {
          if (
            await confirmDialog({
              title: 'Xoá hết trên trang này?',
              text: 'Xoá mọi nét vẽ và ghi chú của trang đang xem.',
              danger: true,
              confirmLabel: 'Xoá',
            })
          )
            setPage(pageKey, () => ({ s: [], n: [] }));
        }}
      >
        <Trash2 size={15} />
      </IconButton>
    </div>
  );
}
