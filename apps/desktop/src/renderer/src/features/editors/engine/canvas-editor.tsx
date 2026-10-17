import {
  Boxes,
  ClipboardPaste,
  Copy,
  Eye,
  Grid3x3,
  Group,
  LayoutDashboard,
  Layers,
  Lock,
  Maximize,
  Minus,
  Network,
  Plus,
  Scissors,
  Shapes,
  Trash2,
  Ungroup,
  Workflow,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';
import {
  importIntoDiagram,
  modelMap,
  parseImport,
  readDiagram,
  stringifyFile,
  toDiagramFile,
  ImportError,
} from '@umlab/core';
import { umlab } from '@/lib/api';
import { cn } from '@/lib/cn';
import { slug } from '@/lib/format';
import { choiceDialog, confirmDialog, IconButton, openContextMenu, openMenuAt, toast, type MenuEntry } from '@/ui';
import { useSession } from '../../auth/session';
import { LOCAL } from '../../workspace/session';
import type { EditorProps } from '../editor-registry';
import { Canvas, type CanvasApi } from './canvas';
import { Engine } from './engine';
import { diagramSVG, ExportImageDialog, type ExportSource } from './export';
import { Inspector } from './inspector';
import { autoLayout } from './layout';
import {
  copySelection,
  createConnector,
  createConnectorTx,
  createViewTx,
  deleteFromModel,
  deleteSelection,
  duplicateSelection,
  finishPen,
  groupSelection,
  modelUsages,
  nudge,
  paste,
  toggleFlag,
  viewCtx,
  zOrder,
} from './ops';
import { Palette, UmlIcon } from './palette';
import { DiagramsPanel, FindPanel, IssuesPanel, LayersPanel, useIssues } from './panels';
import { getConnector, getPasteHandlers, getShape } from './registry';
import { resetTextCache } from './text';
import { FONT_CSS } from './roboto-font';

/** Ô chèn Model Explorer (P12 đăng ký). */
let ModelExplorerSlot: ComponentType<{ engine: Engine }> | null = null;
export function registerModelExplorer(c: ComponentType<{ engine: Engine }>) {
  ModelExplorerSlot = c;
}

let fontInjected = false;
export function ensureFont() {
  if (fontInjected || typeof document === 'undefined') return;
  fontInjected = true;
  const s = document.createElement('style');
  s.textContent = FONT_CSS;
  document.head.appendChild(s);
  void Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 14px Roboto`)))
    .catch(() => {})
    .then(() => resetTextCache());
}

type LeftTab = string;

/** Tab thêm vào thanh dọc bên trái (vd. tab Icon của sơ đồ kiến trúc). */
export interface LeftTabDef {
  id: string;
  label: string;
  icon: ReactNode;
  render: (e: Engine, api: { center: () => [number, number]; editText: (id: string) => void }) => ReactNode;
}

export interface CanvasEditorOptions {
  /** Phần bổ sung dưới Inspector (vd. nút Tạo đặc tả). */
  inspectorExtra?: (e: Engine) => ReactNode;
  /** Mục thêm vào menu chuột phải của hình. */
  extraMenu?: (e: Engine, target: { viewId?: string; connId?: string }) => MenuEntry[];
  /** Nút thêm trên thanh trên. */
  toolbar?: (e: Engine) => ReactNode;
  /** Lớp phủ thêm trên canvas (banner "Sinh từ đặc tả…"). */
  banner?: (e: Engine) => ReactNode;
  /** Tab riêng chèn sau tab Palette. */
  leftTabs?: LeftTabDef[];
}

/** Editor canvas đầy đủ cho một loại sơ đồ: palette, canvas, inspector, panel phụ, xuất/nhập. */
export function CanvasEditor(props: EditorProps & { options?: CanvasEditorOptions }) {
  const { session, diagram, readOnly, setActions, options } = props;
  const nav = useNavigate();
  const user = useSession((s) => s.user);
  ensureFont();
  const engine = useMemo(
    () => new Engine(session, diagram.id, diagram.type, readOnly, user?.id ?? ''),
    [session, diagram.id, diagram.type, readOnly, user?.id],
  );
  useEffect(() => () => engine.destroy(), [engine]);
  const api = useRef<CanvasApi | null>(null);
  const [left, setLeft] = useState<LeftTab>('palette');
  const [exporting, setExporting] = useState(false);
  const panel = useStore(engine.store, (s) => s.panel);
  const wantTab = useStore(engine.store, (s) => s.leftTab);
  useEffect(() => {
    if (!wantTab) return;
    setLeft(wantTab);
    engine.set({ leftTab: null });
  }, [wantTab, engine]);
  const zoom = useStore(engine.store, (s) => s.zoom);
  const grid = useStore(engine.store, (s) => s.grid);
  const issues = useIssues(engine);
  const openDiagram = (id: string) => nav(`/p/${session.projectId}/d/${id}`);

  const focusView = (id: string) => {
    const v = engine.lookup.view(id);
    if (!v) {
      const c = engine.lookup.conn(id);
      if (c) engine.select([], [c.id]);
      return;
    }
    engine.select([id]);
    const el = document.querySelector('[data-testid="canvas"]') as HTMLElement | null;
    if (el) {
      const z = Math.max(engine.state.zoom, 0.8);
      engine.set({
        zoom: z,
        tx: el.clientWidth / 2 - (v.x + v.w / 2) * z,
        ty: el.clientHeight / 2 - (v.y + v.h / 2) * z,
      });
    }
  };

  const exportSource: ExportSource = {
    name: diagram.name,
    docBackground: diagram.canvas.background || '#FFFFFF',
    hasSelection: engine.state.sel.size > 0,
    build: ({ range, padding, bg }) => {
      const st = engine.state;
      let views = st.order;
      let conns = [...st.conns.values()];
      if (range === 'sel' && st.sel.size) {
        const ids = engine.descendants(st.sel);
        views = views.filter((v) => ids.has(v.id));
        conns = conns.filter(
          (c) => (!c.source.viewId || ids.has(c.source.viewId)) && (!c.target.viewId || ids.has(c.target.viewId)),
        );
      }
      return diagramSVG(views, conns, engine.lookup, {
        padding,
        bg,
        embedFont: true,
        jumps: !!diagram.canvas.lineJumps,
      });
    },
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
      if (parsed.kind !== 'diagram')
        throw new ImportError('Đây là tệp project. Hãy nhập ở trang chủ hoặc dashboard project.');
      const mode = await choiceDialog({
        title: 'Nhập JSON vào sơ đồ đang mở',
        text: `Tệp “${parsed.file.diagram.name}” có ${parsed.file.diagram.views.length} hình. Thay thế nội dung hiện tại hay gộp thêm (đặt bên dưới, không đè)?`,
        options: [
          { value: 'merge', label: 'Gộp thêm' },
          { value: 'replace', label: 'Thay thế', variant: 'primary' },
        ],
      });
      if (!mode) return;
      const n = importIntoDiagram(session.doc, diagram.id, parsed.file, mode, LOCAL);
      toast(`Đã nhập ${n} hình`);
      requestAnimationFrame(() => api.current?.fit());
    } catch (e) {
      if (e instanceof ImportError) toast([e.message, ...e.details].join(' · '), { error: true, ms: 8000 });
      else toast(e instanceof Error ? e.message : String(e), { error: true });
    }
  };

  useEffect(() => {
    setActions({
      exportImage: () => setExporting(true),
      exportJson: () => void exportJson(),
      importJson: readOnly ? undefined : () => void importJson(),
      check: () => engine.set({ panel: engine.state.panel === 'issues' ? 'none' : 'issues' }),
      issues: issues.filter((i) => i.level !== 'info').length,
      extra: options?.toolbar?.(engine),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, issues.length, diagram.name, readOnly]);

  // ---------- phím tắt ----------
  useEffect(() => {
    const onKey = async (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"], .modal')) return;
      const mod = ev.ctrlKey || ev.metaKey;
      const k = ev.key.toLowerCase();
      const st = engine.state;
      if (st.pen && (ev.key === 'Enter' || ev.key === 'Escape')) {
        ev.preventDefault();
        if (ev.key === 'Enter') finishPen(engine, false);
        else engine.set({ pen: null });
        return;
      }
      if (ev.key === 'Escape') {
        if (st.connecting) engine.set({ connecting: null });
        else if (st.tool !== 'tool:select') engine.set({ tool: 'tool:select', sticky: false });
        else if (st.panel !== 'none') engine.set({ panel: 'none' });
        else engine.clearSelection();
        return;
      }
      if (mod && k === 'f') {
        ev.preventDefault();
        engine.set({ panel: 'find' });
        return;
      }
      if (ev.shiftKey && (ev.key === '!' || ev.code === 'Digit1')) {
        ev.preventDefault();
        api.current?.fit();
        return;
      }
      if (mod && k === '0') {
        ev.preventDefault();
        api.current?.zoomAt(1);
        return;
      }
      if (!mod && (k === '=' || k === '+')) return api.current?.zoomAt(st.zoom * 1.2);
      if (!mod && k === '-') return api.current?.zoomAt(st.zoom / 1.2);
      if (!mod && !ev.altKey && k === 'v') return engine.set({ tool: 'tool:select', sticky: false });
      if (!mod && !ev.altKey && k === 'h') return engine.set({ tool: 'tool:hand', sticky: false });
      if (mod && k === 'a') {
        ev.preventDefault();
        engine.select(st.order.filter((v) => !v.locked && !v.hidden).map((v) => v.id));
        return;
      }
      if (mod && k === 'c') {
        const n = copySelection(engine);
        if (n) toast(`Đã sao chép ${n} đối tượng`);
        return;
      }
      if (readOnly) return;
      if (mod && k === 'x') {
        if (copySelection(engine)) deleteSelection(engine);
        return;
      }
      if (mod && k === 'v') {
        ev.preventDefault();
        if (await pasteFromSystem()) return;
        paste(engine);
        return;
      }
      if (mod && k === 'd') {
        ev.preventDefault();
        duplicateSelection(engine);
        return;
      }
      if (mod && k === 'g') {
        ev.preventDefault();
        groupSelection(engine, !ev.shiftKey);
        return;
      }
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        ev.preventDefault();
        if (mod) await deleteFromModelConfirm();
        else deleteSelection(engine);
        return;
      }
      if (ev.key === 'F2' && st.sel.size === 1) {
        ev.preventDefault();
        api.current?.editText([...st.sel][0]);
        return;
      }
      const arrows: Record<string, [number, number]> = {
        arrowleft: [-1, 0],
        arrowright: [1, 0],
        arrowup: [0, -1],
        arrowdown: [0, 1],
      };
      if (arrows[k] && st.sel.size) {
        ev.preventDefault();
        const step = ev.shiftKey ? 10 : 1;
        nudge(engine, arrows[k][0] * step, arrows[k][1] * step);
        return;
      }
      // phím tắt riêng của hình (Alt+Shift+A thêm thuộc tính…)
      if (st.sel.size === 1) {
        const v = engine.lookup.view([...st.sel][0])!;
        const combo = `${ev.ctrlKey ? 'Ctrl+' : ''}${ev.altKey ? 'Alt+' : ''}${ev.shiftKey ? 'Shift+' : ''}${ev.key.length === 1 ? ev.key.toUpperCase() : ev.key}`;
        const fn = getShape(v.shape)?.shortcuts?.[combo];
        if (fn) {
          ev.preventDefault();
          const out: { key?: string } = {};
          engine.apply((tx) => {
            out.key = fn(tx, v) ?? undefined;
          });
          if (out.key) requestAnimationFrame(() => api.current?.editText(v.id, out.key));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, readOnly]);

  /** Dán ảnh (chụp màn hình…) từ clipboard hệ thống qua các PasteHandler đã đăng ký. */
  const pasteFromSystem = async (): Promise<boolean> => {
    const hs = getPasteHandlers(diagram.type);
    if (!hs.length || !navigator.clipboard?.read) return false;
    let items: ClipboardItems;
    try {
      items = await navigator.clipboard.read();
    } catch {
      return false;
    }
    if (!items.some((it) => it.types.some((t) => t.startsWith('image/')))) return false;
    const ctx = {
      engine,
      at: api.current?.center() ?? ([0, 0] as [number, number]),
      shift: false,
      target: null,
      editText: (id: string) => api.current?.editText(id),
    };
    for (const h of hs) if (await h.paste(items, ctx)) return true;
    return false;
  };

  const deleteFromModelConfirm = async () => {
    const mids = [
      ...new Set(
        [...engine.state.sel]
          .map((id) => engine.lookup.view(id)?.modelId)
          .concat([...engine.state.selConns].map((id) => engine.lookup.conn(id)?.modelId))
          .filter(Boolean) as string[],
      ),
    ];
    if (!mids.length) return deleteSelection(engine);
    const usages = mids.flatMap((m) => modelUsages(session.doc, m)).filter((u) => u.diagram.id !== diagram.id);
    if (usages.length) {
      const ok = await confirmDialog({
        title: 'Xoá khỏi mô hình?',
        text: `Phần tử còn xuất hiện ở ${usages.length} sơ đồ khác (${[...new Set(usages.map((u) => u.diagram.name))].slice(0, 4).join(', ')}). Xoá khỏi mô hình sẽ xoá ở tất cả các sơ đồ đó.`,
        confirmLabel: 'Xoá khỏi mô hình',
        danger: true,
      });
      if (!ok) return;
    }
    deleteFromModel(engine, mids);
  };

  // ---------- menu chuột phải ----------
  const onContextMenu = (
    e: React.MouseEvent,
    target: {
      view?: { id: string; shape: string; locked?: boolean; hidden?: boolean; groupId?: string | null };
      conn?: { id: string };
      at: [number, number];
    },
  ) => {
    const ro = readOnly;
    const items: MenuEntry[] = [];
    if (target.view || target.conn) {
      const v = target.view ? engine.lookup.view(target.view.id) : undefined;
      if (v) {
        const def = getShape(v.shape);
        const extra =
          def?.contextMenu?.(v, { apply: (fn) => engine.apply(fn), lookup: engine.lookup, open: openDiagram }) ?? [];
        if (extra.length) items.push(...extra.map((x) => ({ label: x.label, onSelect: x.onSelect })), { type: 'sep' });
      }
      items.push(...(options?.extraMenu?.(engine, { viewId: target.view?.id, connId: target.conn?.id }) ?? []));
      items.push(
        {
          label: 'Cắt',
          icon: <Scissors />,
          shortcut: 'Ctrl+X',
          disabled: ro,
          onSelect: () => copySelection(engine) && deleteSelection(engine),
        },
        { label: 'Sao chép', icon: <Copy />, shortcut: 'Ctrl+C', onSelect: () => copySelection(engine) },
        {
          label: 'Nhân bản',
          icon: <Copy />,
          shortcut: 'Ctrl+D',
          disabled: ro || !v,
          onSelect: () => duplicateSelection(engine),
        },
        { type: 'sep' },
      );
      if (v)
        items.push(
          { label: 'Lên trên cùng', disabled: ro, onSelect: () => zOrder(engine, 'front') },
          { label: 'Xuống dưới cùng', disabled: ro, onSelect: () => zOrder(engine, 'back') },
          {
            label: v.locked ? 'Mở khoá' : 'Khoá',
            icon: <Lock />,
            disabled: ro,
            onSelect: () => toggleFlag(engine, 'locked'),
          },
          { label: 'Ẩn', icon: <Eye />, disabled: ro, onSelect: () => toggleFlag(engine, 'hidden') },
          engine.state.sel.size > 1
            ? {
                label: 'Nhóm',
                icon: <Group />,
                shortcut: 'Ctrl+G',
                disabled: ro,
                onSelect: () => groupSelection(engine, true),
              }
            : v.groupId
              ? {
                  label: 'Bỏ nhóm',
                  icon: <Ungroup />,
                  shortcut: 'Ctrl+Shift+G',
                  disabled: ro,
                  onSelect: () => groupSelection(engine, false),
                }
              : { type: 'sep' },
          { type: 'sep' },
        );
      items.push(
        {
          label: 'Xoá',
          icon: <Trash2 />,
          shortcut: 'Delete',
          danger: true,
          disabled: ro,
          onSelect: () => deleteSelection(engine),
        },
        {
          label: 'Xoá khỏi mô hình',
          shortcut: 'Ctrl+Delete',
          danger: true,
          disabled: ro || !(v?.modelId ?? (target.conn && engine.lookup.conn(target.conn.id)?.modelId)),
          onSelect: () => void deleteFromModelConfirm(),
        },
      );
    } else {
      items.push(
        {
          label: 'Dán',
          icon: <ClipboardPaste />,
          shortcut: 'Ctrl+V',
          disabled: ro,
          onSelect: () => paste(engine, { x: target.at[0], y: target.at[1] }),
        },
        {
          label: 'Chọn tất cả',
          shortcut: 'Ctrl+A',
          onSelect: () => engine.select(engine.state.order.filter((x) => !x.locked && !x.hidden).map((x) => x.id)),
        },
        { label: 'Vừa màn hình', icon: <Maximize />, shortcut: 'Shift+1', onSelect: () => api.current?.fit() },
        { type: 'sep' },
        {
          label: 'Tự bố cục (trên → dưới)',
          icon: <Workflow />,
          disabled: ro,
          onSelect: () => void autoLayout(engine, 'DOWN', false),
        },
        {
          label: 'Tự bố cục (trái → phải)',
          icon: <Network />,
          disabled: ro,
          onSelect: () => void autoLayout(engine, 'RIGHT', false),
        },
      );
    }
    openContextMenu(e, items);
  };

  // ---------- Resource Catalog ----------
  const onCatalogDrop = (
    fromId: string,
    targetId: string | null,
    at: [number, number],
    client: { x: number; y: number },
  ) => {
    const from = engine.lookup.view(fromId);
    if (!from || readOnly) return;
    const def = getShape(from.shape);
    const items = def?.catalog ?? [];
    const entries: MenuEntry[] = [];
    if (targetId) {
      const tgt = engine.lookup.view(targetId)!;
      const kinds = [...new Set(items.map((c) => c.connector))];
      for (const kind of kinds) {
        const cd = getConnector(kind);
        if (!cd) continue;
        const ok = cd.allow ? cd.allow(viewCtx(engine.lookup, from), viewCtx(engine.lookup, tgt), engine.lookup) : true;
        if (ok !== true) continue;
        entries.push({
          label: cd.label,
          icon: <UmlIcon name={cd.icon} size={15} />,
          onSelect: () =>
            createConnector(engine, kind, { viewId: fromId }, { viewId: targetId }, engine.presets.get(kind) ?? {}),
        });
      }
      if (!entries.length) entries.push({ label: 'Không có đường nối hợp lệ giữa hai hình này', disabled: true });
    } else {
      for (const it of items) {
        if (!it.shape) continue;
        const cd = getConnector(it.connector);
        const sd = getShape(it.shape);
        if (!cd || !sd) continue;
        entries.push({
          label: it.label,
          icon: <UmlIcon name={sd.icon} size={15} />,
          onSelect: () => {
            let newId = '';
            engine.apply((tx) => {
              const v = createViewTx(tx, engine, it.shape!, at[0] - sd.defaultSize.w / 2, at[1] - sd.defaultSize.h / 2);
              if (!v) return;
              newId = v.id;
              const a = { viewId: fromId };
              const b = { viewId: v.id };
              createConnectorTx(
                tx,
                engine,
                it.connector,
                it.reverse ? b : a,
                it.reverse ? a : b,
                engine.presets.get(it.connector) ?? {},
              );
            });
            if (newId) {
              engine.select([newId]);
              requestAnimationFrame(() => api.current?.editText(newId));
            }
          },
        });
      }
    }
    if (entries.length) openContextMenu({ clientX: client.x, clientY: client.y, preventDefault() {} }, entries);
  };

  const onDoubleClickView = (v: { id: string; shape: string }) => {
    const full = engine.lookup.view(v.id);
    if (!full) return false;
    return !!getShape(full.shape)?.onDoubleClick?.(full, {
      open: openDiagram,
      lookup: engine.lookup,
      apply: (fn) => engine.apply(fn),
    });
  };

  const tabs: [LeftTab, ReactNode, string][] = [
    ['palette', <Shapes key="p" />, 'Palette'],
    ...(options?.leftTabs ?? []).map((t): [LeftTab, ReactNode, string] => [t.id, t.icon, t.label]),
    ['model', <Boxes key="m" />, 'Model Explorer'],
    ['layers', <Layers key="l" />, 'Lớp'],
    ['diagrams', <LayoutDashboard key="d" />, 'Sơ đồ trong project'],
  ];

  return (
    <div className="editor-grid">
      <nav className="editor-tabs" aria-label="Bảng bên trái">
        {tabs.map(([k, icon, label]) => (
          <IconButton key={k} label={label} active={left === k} onClick={() => setLeft(k)}>
            {icon}
          </IconButton>
        ))}
      </nav>
      <aside className="editor-left">
        {left === 'palette' && <Palette engine={engine} />}
        {options?.leftTabs
          ?.filter((t) => t.id === left)
          .map((t) => (
            <div key={t.id} className="contents">
              {t.render(engine, {
                center: () => api.current?.center() ?? [0, 0],
                editText: (id) => api.current?.editText(id),
              })}
            </div>
          ))}
        {left === 'model' &&
          (ModelExplorerSlot ? (
            <ModelExplorerSlot engine={engine} />
          ) : (
            <p className="p-4 text-muted">Model Explorer sẽ có ở phiên bản sau.</p>
          ))}
        {left === 'layers' && <LayersPanel engine={engine} />}
        {left === 'diagrams' && <DiagramsPanel engine={engine} onOpen={openDiagram} />}
      </aside>
      <main className="relative min-w-0">
        <Canvas
          engine={engine}
          apiRef={api}
          background={diagram.canvas.background || '#FFFFFF'}
          onContextMenu={onContextMenu}
          onCatalogDrop={onCatalogDrop}
          onDoubleClickView={onDoubleClickView}
        />
        {options?.banner?.(engine)}
        {panel === 'issues' && (
          <IssuesPanel
            engine={engine}
            issues={issues}
            onClose={() => engine.set({ panel: 'none' })}
            focus={focusView}
          />
        )}
        {panel === 'find' && (
          <FindPanel engine={engine} onClose={() => engine.set({ panel: 'none' })} focus={focusView} />
        )}
        <div className="hud flex items-center gap-0.5" style={{ padding: 3 }}>
          <IconButton label="Thu nhỏ" size="sm" onClick={() => api.current?.zoomAt(zoom / 1.2)}>
            <Minus />
          </IconButton>
          <button
            className="btn sm tabular-nums"
            style={{ minWidth: 52 }}
            onClick={() => api.current?.fit()}
            title="Vừa màn hình (Shift+1)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <IconButton label="Phóng to" size="sm" onClick={() => api.current?.zoomAt(zoom * 1.2)}>
            <Plus />
          </IconButton>
          <span className="sep" style={{ height: 16 }} />
          <IconButton label="Lưới & bắt dính" size="sm" active={grid} onClick={() => engine.set({ grid: !grid })}>
            <Grid3x3 />
          </IconButton>
          {!readOnly && (
            <IconButton
              label="Tự bố cục"
              size="sm"
              onClick={(e) =>
                openMenuAt(e.currentTarget, [
                  { label: 'Vùng chọn / cả sơ đồ: trên → dưới', onSelect: () => void autoLayout(engine, 'DOWN', true) },
                  {
                    label: 'Vùng chọn / cả sơ đồ: trái → phải',
                    onSelect: () => void autoLayout(engine, 'RIGHT', true),
                  },
                ])
              }
            >
              <Workflow />
            </IconButton>
          )}
        </div>
      </main>
      <aside className={cn('editor-right')}>
        <Inspector engine={engine} extra={options?.inspectorExtra?.(engine)} />
      </aside>
      {exporting && <ExportImageDialog source={exportSource} onClose={() => setExporting(false)} />}
    </div>
  );
}
