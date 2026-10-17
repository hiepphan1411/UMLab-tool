// Editor Gantt (`gantt`) — editor riêng, không dùng canvas engine (docs/phases/P05 mục 5.3). Port toàn bộ Gantt của tool cũ.
// Một sơ đồ Gantt = một bảng (theo sprint hoặc theo module). Dữ liệu ở `data:<id>` của Y.Doc (core/gantt/doc.ts).
import { Diamond, LocateFixed, Plus, Sheet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GST,
  dataMap,
  ddm,
  ddmy,
  dn,
  ds,
  durOf,
  gSummary,
  nextCode,
  normGantt,
  normTask,
  parseImport,
  readDiagram,
  readGantt,
  reportDay,
  stringifyFile,
  toDiagramFile,
  ImportError,
  modelMap,
  type GanttData,
  type GanttTask,
} from '@umlab/core';
import legacyFixture from '@fixtures/unipark-plus.json';
import { umlab } from '@/lib/api';
import { slug } from '@/lib/format';
import { Button, Segmented, choiceDialog, toast } from '@/ui';
import { registerDiagramTemplates, registerEditor, type EditorProps } from '../editor-registry';
import { ensureFont } from '../engine/canvas-editor';
import { ExportImageDialog, type ExportSource } from '../engine/export';
import { registerThumbnail } from '../thumbnails';
import {
  GanttLeft,
  GanttRight,
  ganttExportSVG,
  ganttThumbSVG,
  gLayout,
  isModule,
  leftWidth,
  useGanttPal,
} from './chart';
import { BoardInspector, TaskInspector } from './inspector';
import { makeOps } from './ops';
import { pasteExcelDialog } from './paste-excel';
import { ProgressPop, TaskTip } from './popovers';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Gantt hiện tại của sơ đồ, cập nhật khi Y.Doc đổi (của mình hoặc máy khác). */
function useGantt(doc: EditorProps['session']['doc'], diagramId: string): GanttData {
  const [g, setG] = useState(() => readGantt(doc, diagramId));
  useEffect(() => {
    const m = dataMap(doc, diagramId);
    const upd = () => setG(readGantt(doc, diagramId));
    upd();
    m.observe(upd);
    return () => m.unobserve(upd);
  }, [doc, diagramId]);
  return g;
}

interface Drag {
  id: string;
  kind: 'move' | 'start' | 'end' | 'prog';
  sx: number;
  cx: number;
  cy: number;
  s0: number;
  e0: number;
  p0: number;
  moved: boolean;
}

export function GanttEditor({ session, diagram, readOnly, setActions }: EditorProps) {
  ensureFont();
  const g0 = useGantt(session.doc, diagram.id);
  const ops = useMemo(() => makeOps(session.doc, diagram.id, readOnly), [session.doc, diagram.id, readOnly]);
  const [sel, setSel] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; patch: Partial<GanttTask> } | null>(null);
  const [tip, setTip] = useState<{ id: string; x: number; y: number } | null>(null);
  const [pop, setPop] = useState<{ id: string; x: number; y: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [shadow, setShadow] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const scrolled = useRef(false);
  const P = useGanttPal();

  const g: GanttData = useMemo(() => {
    if (!preview) return g0;
    return {
      ...g0,
      tasks: g0.tasks.map((t) => (t.id === preview.id ? normTask({ ...t, ...preview.patch }) : t)),
    };
  }, [g0, preview]);
  const L = gLayout(g);
  const sm = gSummary(g);
  const mod = isModule(g);
  const task = (id: string | null | undefined) => (id ? g.tasks.find((t) => t.id === id) : undefined);
  const selTask = task(sel);

  const scrollToDay = useCallback(
    (d: number) => {
      const el = scroll.current;
      if (el) el.scrollLeft = Math.max(0, gLayout(g).x(d) - 220);
    },
    [g],
  );
  const scrollToToday = () => scrollToDay(L.rd);
  useEffect(() => {
    if (!scrolled.current && g.tasks.length) {
      scrolled.current = true;
      requestAnimationFrame(() => scrollToDay(reportDay(g)));
    }
  }, [g, scrollToDay]);
  useEffect(() => {
    if (sel && !g0.tasks.some((t) => t.id === sel)) setSel(null);
  }, [g0, sel]);

  // ---------- thêm / nhân bản / xoá ----------
  const addTask = (type: 'task' | 'milestone') => {
    const last = g.tasks[g.tasks.length - 1];
    const start = last ? dn(last.end) + 1 : L.rd;
    const raw: Partial<GanttTask> =
      type === 'milestone'
        ? { type, code: 'Mốc', name: 'Mốc quan trọng', start: ds(start) }
        : mod
          ? {
              type,
              code: '',
              name: 'NewModule',
              icon: 'lucide:box',
              start: ds(start),
              end: ds(start + 13),
              owner: last?.owner ?? '',
              progress: 0,
            }
          : {
              type,
              code: nextCode(g.tasks),
              name: 'Giai đoạn mới',
              start: ds(start),
              end: ds(start + 13),
              owner: last?.owner ?? '',
              progress: 0,
            };
    const idx = sel ? g.tasks.findIndex((x) => x.id === sel) + 1 : g.tasks.length;
    const t = ops.insert(raw, idx || g.tasks.length);
    if (!t) return;
    setSel(t.id);
    requestAnimationFrame(() => {
      scrollToDay(dn(t.start));
      (document.querySelector('.gantt-grid aside [data-focus]') as HTMLInputElement | null)?.focus();
    });
  };
  const duplicate = () => {
    const i = g.tasks.findIndex((t) => t.id === sel);
    if (i < 0) return;
    const src = g.tasks[i];
    const t = ops.insert({ ...src, id: undefined, code: src.code + ' (bản sao)' }, i + 1);
    if (t) setSel(t.id);
  };
  const remove = () => {
    if (!sel) return;
    ops.remove(sel);
    setSel(null);
  };

  // ---------- phím tắt ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, .modal')) return;
      if (e.key === 'Escape') {
        setTip(null);
        setPop(null);
        setSel(null);
      }
      if (readOnly || !sel) return;
      if (e.key === 'Delete') {
        e.preventDefault();
        remove();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // bấm ra ngoài → đóng tooltip / popover
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!t.closest('.g-scroll') && !t.closest('[data-gtip]')) setTip(null);
      if (!t.closest('[data-gpop]') && !t.closest('[data-gprog]')) setPop(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []);

  // ---------- kéo thanh ----------
  const onPointerDown = (ev: React.PointerEvent) => {
    if (ev.button !== 0) return;
    const t = ev.target as Element;
    const h = t.closest('[data-gh]');
    const bar = t.closest('[data-gt]');
    const row = t.closest('[data-gr]');
    const pg = t.closest('[data-gprog]');
    const id = pg?.getAttribute('data-gprog') ?? bar?.getAttribute('data-gt') ?? row?.getAttribute('data-gr');
    setTip(null);
    if (!id) {
      setPop(null);
      setSel(null);
      return;
    }
    const tk = task(id)!;
    if (pg) {
      ev.preventDefault();
      setSel(id);
      setPop({ id, x: ev.clientX, y: ev.clientY });
      return;
    }
    setPop(null);
    if (h && !readOnly) {
      ev.preventDefault();
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      drag.current = {
        id,
        kind: h.getAttribute('data-gh') as Drag['kind'],
        sx: ev.clientX,
        cx: ev.clientX,
        cy: ev.clientY,
        s0: dn(tk.start),
        e0: dn(tk.end),
        p0: tk.progress,
        moved: false,
      };
      setSel(id);
      return;
    }
    setSel(id);
    setTip({ id, x: ev.clientX, y: ev.clientY });
  };
  const onPointerMove = (ev: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const tk = g0.tasks.find((t) => t.id === d.id);
    if (!tk) return;
    const dx = ev.clientX - d.sx;
    const dd = Math.round(dx / L.ppd);
    if (Math.abs(dx) > 2) d.moved = true;
    if (!d.moved) return;
    let patch: Partial<GanttTask> = {};
    if (d.kind === 'move')
      patch = { start: ds(d.s0 + dd), end: tk.type === 'milestone' ? ds(d.s0 + dd) : ds(d.e0 + dd) };
    else if (d.kind === 'start') patch = { start: ds(Math.min(d.e0, d.s0 + dd)) };
    else if (d.kind === 'end') patch = { end: ds(Math.max(d.s0, d.e0 + dd)) };
    else if (d.kind === 'prog') {
      const bw = durOf(tk) * L.ppd;
      patch = { progress: clamp(Math.round((d.p0 + (dx / bw) * 100) / 5) * 5, 0, 100), autoProg: false };
    }
    setPreview({ id: d.id, patch });
    setTip({ id: d.id, x: ev.clientX, y: ev.clientY });
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved && preview && preview.id === d.id) {
      ops.setTask(d.id, preview.patch);
      setTip(null);
    } else if (!d.moved) setTip({ id: d.id, x: d.cx, y: d.cy });
    setPreview(null);
  };

  // ---------- nhập / xuất ----------
  const exportSource: ExportSource = {
    name: g.title || diagram.name,
    docBackground: '#FFFFFF',
    hasSelection: false,
    build: ({ padding, bg }) => ganttExportSVG(g0, { padding, bg, embedFont: true }),
  };
  const exportJson = async () => {
    const d = readDiagram(session.doc, diagram.id);
    if (!d) return;
    const path = await umlab.files.save({
      defaultName: `${slug(d.name)}.umlab.json`,
      filters: [{ name: 'Sơ đồ UMLab', extensions: ['json'] }],
      data: stringifyFile(toDiagramFile(d, [...modelMap(session.doc).values()])),
    });
    if (path) toast('Đã lưu ' + path.split(/[\\/]/).pop());
  };
  const importJson = async () => {
    const files = await umlab.files.open({ filters: [{ name: 'JSON', extensions: ['json'] }], asText: true });
    if (!files.length) return;
    try {
      const parsed = parseImport(files[0].text ?? '');
      if (parsed.kind !== 'diagram' || parsed.file.diagram.type !== 'gantt')
        throw new ImportError('Tệp này không phải sơ đồ Gantt.');
      const inc = normGantt(parsed.file.diagram.data, g.board);
      const mode = await choiceDialog({
        title: 'Nhập JSON vào Gantt đang mở',
        text: `Tệp “${parsed.file.diagram.name}” có ${inc.tasks.length} ${mod ? 'module' : 'giai đoạn'}. Thay thế toàn bộ hay thêm vào cuối?`,
        options: [
          { value: 'append', label: 'Thêm vào cuối' },
          { value: 'replace', label: 'Thay thế', variant: 'primary' },
        ],
      });
      if (!mode) return;
      session.doc.transact(() => {
        if (mode === 'replace') {
          const { tasks: _t, board: _b, ...meta } = inc;
          ops.setMeta(meta);
        }
        ops.put(inc.tasks, mode);
      });
      toast(`Đã nhập ${inc.tasks.length} dòng`);
    } catch (e) {
      if (e instanceof ImportError) toast([e.message, ...e.details].join(' · '), { error: true, ms: 8000 });
      else toast(e instanceof Error ? e.message : String(e), { error: true });
    }
  };
  const pasteExcel = async () => {
    const r = await pasteExcelDialog();
    if (!r) return;
    ops.put(r.tasks, r.mode);
    setSel(null);
    scrolled.current = false;
    toast(`Đã nhập ${r.tasks.length} ${mod ? 'module' : 'giai đoạn'}`);
  };

  useEffect(() => {
    setActions({
      exportImage: () => setExporting(true),
      exportJson: () => void exportJson(),
      importJson: readOnly ? undefined : () => void importJson(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram.id, readOnly, g0]);

  // ---------- đầu trang ----------
  const [title, setTitle] = useState(g.title);
  useEffect(() => setTitle(g0.title), [g0.title]);
  const diff = sm.overall - sm.planned;
  const C = 2 * Math.PI * 22;
  const lw = leftWidth(g);
  const H = L.HH + g.tasks.length * L.RH;
  const tipTask = task(tip?.id);
  const popTask = task(pop?.id);
  const ff = { fontFamily: "Roboto, 'Helvetica Neue', Arial, sans-serif", display: 'block' } as const;

  return (
    <div className="gantt-grid">
      <section className="gantt-wrap" aria-label="Biểu đồ Gantt">
        <div className="g-head">
          <div className="g-title">
            <input
              aria-label="Tên dự án"
              value={title}
              readOnly={readOnly}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== g0.title && ops.setMeta({ title })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            <div className="g-sub">
              {mod ? 'Theo module' : 'Theo sprint'} · Ngày báo cáo {ddmy(sm.rd)} ·{' '}
              {g.tasks.length ? `${ddm(sm.mn)} – ${ddmy(sm.mx)}` : `chưa có ${mod ? 'module' : 'giai đoạn'}`}
            </div>
          </div>
          <div className="g-stats">
            <div className="g-ring" data-kpi="overall">
              <svg viewBox="0 0 56 56" width={56} height={56} aria-hidden>
                <circle cx={28} cy={28} r={22} fill="none" stroke="var(--line)" strokeWidth={6} />
                <circle
                  cx={28}
                  cy={28}
                  r={22}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={`${(C * sm.overall) / 100} ${C}`}
                  transform="rotate(-90 28 28)"
                />
              </svg>
              <div>
                <div className="kv-num">{sm.overall}%</div>
                <div className="kv-lbl">Tiến độ chung</div>
                <div className="kv-sub" style={{ color: diff >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
                  {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}% so với kế hoạch ({sm.planned}%)
                </div>
              </div>
            </div>
            {(
              [
                [`${sm.cnt.done ?? 0}/${g.tasks.length}`, mod ? 'Module hoàn thành' : 'Hoàn thành', GST.done.c],
                [sm.cnt.progress ?? 0, 'Đang thực hiện', GST.progress.c],
                [(sm.cnt.late ?? 0) + (sm.cnt.risk ?? 0), 'Trễ hạn / rủi ro', GST.late.c],
                [sm.left >= 0 ? sm.left + ' ngày' : 'Đã kết thúc', 'Còn lại đến hạn', 'var(--muted)'],
              ] as const
            ).map(([n, lbl, c]) => (
              <div key={lbl} className="kpi">
                <span className="kpi-dot" style={{ background: c }} />
                <div>
                  <div className="kv-num sm">{n}</div>
                  <div className="kv-lbl">{lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="g-tools">
          <Segmented
            ariaLabel="Chia theo"
            value={g.scale}
            onChange={(scale) => {
              ops.setMeta({ scale });
              requestAnimationFrame(scrollToToday);
            }}
            options={[
              { value: 'day', label: 'Ngày' },
              { value: 'week', label: 'Tuần' },
              { value: 'month', label: 'Tháng' },
            ]}
          />
          <Button variant="outline" icon={<LocateFixed />} onClick={scrollToToday}>
            Hôm nay
          </Button>
          {!readOnly && (
            <>
              <Button variant="outline" icon={<Sheet />} onClick={() => void pasteExcel()}>
                Dán từ Excel
              </Button>
              <Button variant="outline" icon={<Diamond />} onClick={() => addTask('milestone')}>
                Thêm mốc
              </Button>
              <Button variant="primary" icon={<Plus />} onClick={() => addTask('task')}>
                {mod ? 'Thêm module' : 'Thêm sprint'}
              </Button>
            </>
          )}
          <div className="g-legend">
            {Object.entries(GST).map(([k, v]) => (
              <span key={k} className="lg">
                <i style={{ background: v.c }} />
                {v.n}
              </span>
            ))}
          </div>
        </div>
        <div className="g-card">
          <div
            ref={scroll}
            className="g-scroll"
            data-testid="gantt"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onScroll={(e) => {
              setTip(null);
              setPop(null);
              setShadow((e.target as HTMLElement).scrollLeft > 2);
            }}
          >
            <div className="g-inner">
              <div className={'g-left' + (shadow ? ' shadowed' : '')}>
                <svg width={lw} height={H} style={ff}>
                  <GanttLeft g={g} L={L} P={P} exp={false} sel={sel} />
                </svg>
              </div>
              <div>
                <svg width={L.W} height={H} style={ff}>
                  <GanttRight g={g} L={L} P={P} exp={false} sel={sel} />
                </svg>
              </div>
            </div>
          </div>
          {!g.tasks.length && (
            <div className="g-empty">
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  Chưa có {mod ? 'module' : 'giai đoạn'} nào
                </p>
                <p className="mt-1">Bấm “{mod ? 'Thêm module' : 'Thêm sprint'}” hoặc dán bảng tiến độ từ Excel.</p>
              </div>
            </div>
          )}
        </div>
      </section>
      <aside aria-label="Thuộc tính">
        <div className="scroll">
          {selTask ? (
            <TaskInspector
              key={selTask.id}
              g={g}
              t={selTask}
              ops={ops}
              readOnly={readOnly}
              onDuplicate={duplicate}
              onDelete={remove}
            />
          ) : (
            <BoardInspector g={g} ops={ops} readOnly={readOnly} />
          )}
        </div>
      </aside>
      {tipTask && !pop && <TaskTip t={tipTask} rd={L.rd} x={tip!.x} y={tip!.y} />}
      {popTask && (
        <ProgressPop
          t={popTask}
          rd={L.rd}
          x={pop!.x}
          y={pop!.y}
          readOnly={readOnly}
          onPreview={(v) => setPreview(v === null ? null : { id: popTask.id, patch: { progress: v } })}
          onProgress={(v) => {
            setPreview(null);
            ops.setTask(popTask.id, { progress: clamp(v, 0, 100) });
          }}
          onItem={(i, done) =>
            ops.setTask(popTask.id, (x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, done } : it)) }))
          }
          onClose={() => setPop(null)}
          onMore={() => {
            setPop(null);
            requestAnimationFrame(() =>
              (
                document.querySelector('.gantt-grid aside input[aria-label="Tiến độ (%)"]') as HTMLInputElement | null
              )?.focus(),
            );
          }}
        />
      )}
      {exporting && <ExportImageDialog source={exportSource} onClose={() => setExporting(false)} />}
    </div>
  );
}

registerEditor('gantt', (p) => <GanttEditor {...p} />);
registerThumbnail('gantt', (doc, d) => ganttThumbSVG(readGantt(doc, d.id)));

const fixture = legacyFixture as { gantt?: unknown; moduleGantt?: unknown };
registerDiagramTemplates('gantt', [
  {
    id: 'sprint',
    label: 'Theo sprint',
    description: 'Bảng trống, mỗi dòng là một sprint / giai đoạn',
    build: ({ name }) => ({ data: normGantt({ title: name }, 'sprint') }),
  },
  {
    id: 'module',
    label: 'Theo module',
    description: 'Bảng trống, mỗi dòng là một module kèm checklist chức năng',
    build: ({ name }) => ({
      data: normGantt(
        { title: name, columns: { code: true, name: true, owner: true, progress: true, status: true } },
        'module',
      ),
    }),
  },
  {
    id: 'unipark-sprint',
    label: 'Mẫu UniPark+ theo sprint',
    description: 'Tiến độ khoá luận UniPark+ (từ Diagram Studio cũ)',
    build: () => ({ data: normGantt(fixture.gantt, 'sprint') }),
  },
  {
    id: 'unipark-module',
    label: 'Mẫu UniPark+ theo module',
    description: 'Tiến độ theo module của UniPark+ (từ Diagram Studio cũ)',
    build: () => ({ data: normGantt(fixture.moduleGantt, 'module') }),
  },
]);
