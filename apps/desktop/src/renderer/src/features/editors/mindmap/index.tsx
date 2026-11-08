// Editor sơ đồ tư duy (`mindmap`) — editor riêng, không dùng canvas engine. Dữ liệu ở `data:<id>` (core/mindmap/doc.ts).
// Canvas SVG: kéo khung nhìn, Ctrl+lăn chuột để zoom, kéo node để dời cả nhánh, thả lên node khác để đổi cha,
// bấm node mở drawer kiến thức chi tiết, nút khoá để chuyển sang chế độ chỉ xem.
import {
  BookMarked,
  ChevronsDownUp,
  ChevronsUpDown,
  Focus,
  GitFork,
  ListTree,
  Lock,
  LockOpen,
  Maximize,
  Minus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ImportError,
  dataMap,
  emptyMindmap,
  mindReplace,
  modelMap,
  normMindmap,
  parseImport,
  readDiagram,
  readMindmap,
  stringifyFile,
  toDiagramFile,
  type MindmapData,
  type MindNode,
} from '@umlab/core';
import { umlab } from '@/lib/api';
import { slug } from '@/lib/format';
import { Button, IconButton, confirmDialog, openContextMenu, toast, type MenuEntry } from '@/ui';
import { registerDiagramTemplates, registerEditor, type EditorProps } from '../editor-registry';
import { ensureFont } from '../engine/canvas-editor';
import { ExportImageDialog, type ExportSource } from '../engine/export';
import { registerThumbnail } from '../thumbnails';
import { MindDrawer } from './drawer';
import { computeLayout, hitNode, type MindLayout } from './layout';
import { makeOps } from './ops';
import { MindScene, mindExportSVG, mindThumbSVG, useMindPal } from './scene';
import './mindmap.css';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
const DRAWER_KEY = 'umlab.mindmap.drawerW';

function useMindmap(doc: EditorProps['session']['doc'], diagramId: string, name: string): MindmapData {
  const [d, setD] = useState(() => readMindmap(doc, diagramId, name));
  useEffect(() => {
    const m = dataMap(doc, diagramId);
    const upd = () => setD(readMindmap(doc, diagramId, name));
    upd();
    m.observe(upd);
    return () => m.unobserve(upd);
  }, [doc, diagramId, name]);
  return d;
}

/** Dời cả nhánh `ids` một đoạn (xem trước khi kéo). */
function shifted(L: MindLayout, ids: Set<string>, dx: number, dy: number): MindLayout {
  const boxes = new Map(L.boxes);
  for (const id of ids) {
    const b = boxes.get(id);
    if (b) boxes.set(id, { ...b, x: b.x + dx, y: b.y + dy });
  }
  return { ...L, boxes };
}

type Gesture =
  | { kind: 'pan'; sx: number; sy: number; tx: number; ty: number; moved: boolean }
  | { kind: 'node'; id: string; sx: number; sy: number; moved: boolean };

export function MindmapEditor({ session, diagram, readOnly, setActions }: EditorProps) {
  ensureFont();
  const d = useMindmap(session.doc, diagram.id, diagram.name);
  const locked = d.locked;
  const ops = useMemo(
    () => makeOps(session.doc, diagram.id, readOnly, locked),
    [session.doc, diagram.id, readOnly, locked],
  );
  const canEdit = !readOnly && !locked;
  const P = useMindPal();
  const wrap = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ tx: 0, ty: 0, z: 1 });
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [sel, setSel] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [drawerW, setDrawerW] = useState(() => {
    try {
      return Number(localStorage.getItem(DRAWER_KEY)) || 560;
    } catch {
      return 560;
    }
  });
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; drop: string | null } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hitIdx, setHitIdx] = useState(0);
  const [exporting, setExporting] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const fitted = useRef(false);

  // dữ liệu chưa ghi vào Y.Doc (sơ đồ cũ / rỗng) → ghi bản chuẩn hoá để thao tác được
  useEffect(() => {
    if (readOnly) return;
    const m = dataMap(session.doc, diagram.id);
    if (![...m.keys()].some((k) => k.startsWith('node:')))
      mindReplace(session.doc, diagram.id, readMindmap(session.doc, diagram.id, diagram.name), 'init');
  }, [session.doc, diagram.id, diagram.name, readOnly]);

  const L0 = useMemo(() => computeLayout(d), [d]);
  const t = L0.tree;
  const dragIds = useMemo(() => (drag ? new Set(t.subtree(drag.id)) : null), [drag, t]);
  const L = useMemo(() => (drag && dragIds ? shifted(L0, dragIds, drag.dx, drag.dy) : L0), [L0, drag, dragIds]);

  // ---------- tìm kiếm ----------
  const hits = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return null;
    const s = new Set<string>();
    for (const n of d.nodes)
      if (fold([n.title, n.summary, n.detail, n.tags.join(' ')].join('\n')).includes(q)) s.add(n.id);
    return s;
  }, [query, d.nodes]);
  const hitList = useMemo(() => (hits ? d.nodes.filter((n) => hits.has(n.id)).map((n) => n.id) : []), [hits, d.nodes]);

  // ---------- khung nhìn ----------
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const availW = size.w - (drawer ? drawerW : 0);
  const fit = useCallback(() => {
    const b = L0.bounds;
    const z = clamp(Math.min((availW - 80) / Math.max(1, b.w), (size.h - 80) / Math.max(1, b.h)), 0.15, 1.4);
    setView({ z, tx: availW / 2 - (b.x + b.w / 2) * z, ty: size.h / 2 - (b.y + b.h / 2) * z });
  }, [L0, availW, size.h]);
  useEffect(() => {
    if (fitted.current || size.w < 50) return;
    fitted.current = true;
    fit();
  }, [fit, size.w]);
  const zoomAt = useCallback((z: number, cx: number, cy: number) => {
    setView((v) => {
      const nz = clamp(z, 0.12, 3);
      const wx = (cx - v.tx) / v.z;
      const wy = (cy - v.ty) / v.z;
      return { z: nz, tx: cx - wx * nz, ty: cy - wy * nz };
    });
  }, []);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      if ((ev.target as HTMLElement).closest('.mm-drawer, .mm-bar')) return;
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      if (ev.ctrlKey || ev.metaKey) {
        setView((v) => {
          const nz = clamp(v.z * Math.exp(-ev.deltaY * 0.0022), 0.12, 3);
          const cx = ev.clientX - r.left;
          const cy = ev.clientY - r.top;
          const wx = (cx - v.tx) / v.z;
          const wy = (cy - v.ty) / v.z;
          return { z: nz, tx: cx - wx * nz, ty: cy - wy * nz };
        });
      } else if (ev.shiftKey) setView((v) => ({ ...v, tx: v.tx - ev.deltaY }));
      else setView((v) => ({ ...v, tx: v.tx - ev.deltaX, ty: v.ty - ev.deltaY }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /** Mở các nhánh cha đang thu gọn và đưa node vào giữa vùng nhìn nếu đang khuất. */
  const reveal = useCallback(
    (id: string, center = false) => {
      const closed = t.path(id).filter((p) => p.collapsed);
      if (closed.length) ops.patch(Object.fromEntries(closed.map((p) => [p.id, { collapsed: false }])));
      requestAnimationFrame(() => {
        const b = computeLayout(readMindmap(session.doc, diagram.id, diagram.name)).boxes.get(id);
        if (!b) return;
        setView((v) => {
          const sx = b.x * v.z + v.tx;
          const sy = b.y * v.z + v.ty;
          const w = size.w - (drawer || center ? drawerW : 0);
          if (!center && sx > 60 && sx < w - 60 && sy > 60 && sy < size.h - 60) return v;
          return { ...v, tx: w / 2 - b.x * v.z, ty: size.h / 2 - b.y * v.z };
        });
      });
    },
    [t, ops, session.doc, diagram.id, diagram.name, size, drawer, drawerW],
  );

  const open = useCallback(
    (id: string) => {
      setSel(id);
      setDrawer(id);
      reveal(id, !drawer);
    },
    [reveal, drawer],
  );

  // ---------- thao tác node ----------
  const addChild = (pid: string | null = sel) => {
    if (!canEdit) return;
    const parent = pid ?? t.root.id;
    if (t.byId.get(parent)?.collapsed) ops.setNode(parent, { collapsed: false });
    const n = ops.add(parent, { title: 'Ý mới' });
    if (n) {
      setSel(n.id);
      setRenaming(n.id);
      reveal(n.id);
    }
  };
  const addSibling = (id: string | null = sel) => {
    if (!canEdit) return;
    const n0 = id ? t.byId.get(id) : null;
    if (!n0 || !n0.parentId) return addChild(t.root.id);
    const n = ops.add(n0.parentId, { title: 'Ý mới', kind: n0.kind === 'branch' ? 'branch' : 'topic' }, n0.id);
    if (n) {
      setSel(n.id);
      setRenaming(n.id);
      reveal(n.id);
    }
  };
  const remove = async (id: string | null = sel) => {
    if (!canEdit || !id || id === t.root.id) return;
    const n = t.byId.get(id)!;
    const cnt = t.subtree(id).length - 1;
    if (cnt > 0) {
      const ok = await confirmDialog({
        title: 'Xoá nhánh',
        text: `Xoá “${n.title || 'Chưa đặt tên'}” cùng ${cnt} ý con?`,
        confirmLabel: 'Xoá',
        danger: true,
      });
      if (!ok) return;
    }
    const sibs = t.children(n.parentId!);
    const i = sibs.findIndex((s) => s.id === id);
    ops.remove(id);
    const next = sibs[i + 1] ?? sibs[i - 1] ?? t.byId.get(n.parentId!);
    setSel(next?.id ?? null);
    if (drawer && t.subtree(id).includes(drawer)) setDrawer(null);
  };
  const toggle = (id: string) => {
    const n = t.byId.get(id);
    if (n && t.children(id).length) ops.setNode(id, { collapsed: !n.collapsed });
  };
  const reorder = (id: string, dir: -1 | 1) => {
    const n = t.byId.get(id);
    if (!canEdit || !n?.parentId) return;
    const sibs = t.children(n.parentId);
    const i = sibs.findIndex((s) => s.id === id);
    if (i + dir < 0 || i + dir >= sibs.length) return;
    ops.move(id, n.parentId, i + dir);
  };
  const resetPositions = () => {
    const withOff = d.nodes.filter((n) => n.off);
    if (!withOff.length) return toast('Sơ đồ đang theo bố cục tự động');
    ops.patch(Object.fromEntries(withOff.map((n) => [n.id, { off: null }])));
    requestAnimationFrame(fit);
  };
  const collapseLevel = (level: number) => {
    const p: Record<string, Partial<MindNode>> = {};
    for (const n of d.nodes) {
      const dep = t.depth(n.id);
      const want = dep >= level && t.children(n.id).length > 0;
      if (n.collapsed !== want) p[n.id] = { collapsed: want };
    }
    if (Object.keys(p).length) ops.patch(p);
    requestAnimationFrame(fit);
  };

  const nodeMenu = (id: string): MenuEntry[] => {
    const n = t.byId.get(id)!;
    const isRoot = id === t.root.id;
    return [
      { label: 'Xem kiến thức chi tiết', icon: <BookMarked />, onSelect: () => open(id) },
      { type: 'sep' },
      { label: 'Thêm ý con', shortcut: 'Tab', icon: <Plus />, disabled: !canEdit, onSelect: () => addChild(id) },
      {
        label: 'Thêm ý cùng cấp',
        shortcut: 'Enter',
        icon: <GitFork />,
        disabled: !canEdit || isRoot,
        onSelect: () => addSibling(id),
      },
      { label: 'Đổi tên', shortcut: 'F2', disabled: !canEdit, onSelect: () => setRenaming(id) },
      {
        label: 'Đánh dấu câu hỏi phản biện',
        checked: n.kind === 'question',
        disabled: !canEdit || isRoot,
        onSelect: () =>
          ops.setNode(id, { kind: n.kind === 'question' ? (t.depth(id) === 1 ? 'branch' : 'topic') : 'question' }),
      },
      { type: 'sep' },
      {
        label: n.collapsed ? 'Mở nhánh' : 'Thu gọn nhánh',
        shortcut: 'Space',
        disabled: !t.children(id).length || readOnly,
        onSelect: () => toggle(id),
      },
      { label: 'Lên trên', shortcut: 'Alt+↑', disabled: !canEdit || isRoot, onSelect: () => reorder(id, -1) },
      { label: 'Xuống dưới', shortcut: 'Alt+↓', disabled: !canEdit || isRoot, onSelect: () => reorder(id, 1) },
      {
        label: 'Về vị trí tự động',
        disabled: !canEdit || !n.off,
        onSelect: () => ops.setNode(id, { off: null }),
      },
      { type: 'sep' },
      {
        label: 'Xoá',
        shortcut: 'Del',
        icon: <Trash2 />,
        danger: true,
        disabled: !canEdit || isRoot,
        onSelect: () => void remove(id),
      },
    ];
  };

  // ---------- chuột ----------
  const local = (e: { clientX: number; clientY: number }) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = e.target as Element;
    if (el.closest('.mm-drawer, .mm-bar, .mm-zoom, .mm-rename')) return;
    wrap.current?.focus({ preventScroll: true });
    const tg = el.closest('[data-toggle]');
    if (tg) {
      toggle(tg.getAttribute('data-toggle')!);
      return;
    }
    const nd = el.closest('[data-node]');
    if (nd)
      gesture.current = { kind: 'node', id: nd.getAttribute('data-node')!, sx: e.clientX, sy: e.clientY, moved: false };
    else gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    // chỉ bắt con trỏ khi đã bắt đầu kéo — bắt sớm làm click/double-click mất node đích
    const capture = () => {
      const el = e.currentTarget as HTMLElement;
      if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
    };
    if (g.kind === 'pan') {
      if (Math.hypot(dx, dy) > 3) {
        g.moved = true;
        capture();
      }
      setView((v) => ({ ...v, tx: g.tx + dx, ty: g.ty + dy }));
      return;
    }
    if (!g.moved && Math.hypot(dx, dy) > 4 && canEdit) {
      g.moved = true;
      capture();
    }
    if (!g.moved) return;
    const p = local(e);
    const wx = (p.x - view.tx) / view.z;
    const wy = (p.y - view.ty) / view.z;
    const skip = new Set(t.subtree(g.id));
    const drop = g.id === t.root.id ? null : hitNode(L0, wx, wy, skip);
    setDrag({
      id: g.id,
      dx: dx / view.z,
      dy: dy / view.z,
      drop: drop && drop !== t.byId.get(g.id)?.parentId ? drop : null,
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.kind === 'pan') {
      if (!g.moved) setSel(null);
      return;
    }
    if (!g.moved) {
      open(g.id);
      return;
    }
    const dr = drag;
    setDrag(null);
    if (!dr) return;
    if (dr.drop) {
      if (ops.move(dr.id, dr.drop, t.children(dr.drop).length)) {
        if (t.byId.get(dr.drop)?.collapsed) ops.setNode(dr.drop, { collapsed: false });
        toast(`Đã chuyển vào “${t.byId.get(dr.drop)?.title ?? ''}”`);
      }
      return;
    }
    const n = t.byId.get(dr.id)!;
    const b = L0.boxes.get(dr.id)!;
    if (!n.parentId) ops.setNode(dr.id, { off: { dx: b.x + dr.dx, dy: b.y + dr.dy } });
    else {
      const pb = L0.boxes.get(n.parentId)!;
      ops.setNode(dr.id, { off: { dx: b.x + dr.dx - pb.x, dy: b.y + dr.dy - pb.y } });
    }
    void e;
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const nd = (e.target as Element).closest('[data-node]');
    if (nd && canEdit) setRenaming(nd.getAttribute('data-node'));
    else if (!nd && !(e.target as Element).closest('.mm-drawer, .mm-bar, .mm-zoom')) fit();
  };
  const onContextMenu = (e: React.MouseEvent) => {
    const nd = (e.target as Element).closest('[data-node]');
    if (!nd) return;
    const id = nd.getAttribute('data-node')!;
    setSel(id);
    openContextMenu(e, nodeMenu(id));
  };

  // ---------- bàn phím ----------
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable], .mm-drawer')) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      (document.querySelector('.mm-search input') as HTMLInputElement | null)?.focus();
      return;
    }
    if (e.key === 'Escape') {
      if (drawer) setDrawer(null);
      else setSel(null);
      return;
    }
    if (mod && (e.key === '0' || e.key === '=' || e.key === '-')) {
      e.preventDefault();
      if (e.key === '0') fit();
      else zoomAt(view.z * (e.key === '=' ? 1.2 : 1 / 1.2), availW / 2, size.h / 2);
      return;
    }
    const id = sel;
    if (!id) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) setSel(t.root.id);
      return;
    }
    const b = L.boxes.get(id);
    const n = t.byId.get(id);
    if (!b || !n) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      addChild(id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mod || id === t.root.id) open(id);
      else addSibling(id);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      void remove(id);
    } else if (e.key === 'F2') {
      e.preventDefault();
      if (canEdit) setRenaming(id);
    } else if (e.key === ' ') {
      e.preventDefault();
      toggle(id);
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      reorder(id, e.key === 'ArrowUp' ? -1 : 1);
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const goParent = () => n.parentId && setSel(n.parentId);
      const goChild = (dir: 1 | -1) => {
        const kids = t.children(id).filter((c) => L.boxes.get(c.id)?.dir === dir || id !== t.root.id);
        const vis = kids.filter((c) => L.boxes.has(c.id));
        if (vis.length) setSel(vis[Math.floor(vis.length / 2)].id);
      };
      if (e.key === 'ArrowLeft') {
        if (b.dir === 1 && id !== t.root.id) goParent();
        else goChild(-1);
      } else if (e.key === 'ArrowRight') {
        if (b.dir === -1) goParent();
        else goChild(1);
      } else if (n.parentId) {
        const sibs = t.children(n.parentId).filter((s) => L.boxes.get(s.id)?.dir === b.dir);
        const i = sibs.findIndex((s) => s.id === id);
        const nx = sibs[i + (e.key === 'ArrowUp' ? -1 : 1)];
        if (nx) setSel(nx.id);
      }
    }
  };
  useEffect(() => {
    if (sel && !t.byId.has(sel)) setSel(null);
    if (drawer && drawer !== 'refs' && !t.byId.has(drawer)) setDrawer(null);
  }, [t, sel, drawer]);
  useEffect(() => {
    try {
      localStorage.setItem(DRAWER_KEY, String(drawerW));
    } catch {
      /* bỏ qua */
    }
  }, [drawerW]);

  // ---------- nhập / xuất ----------
  const exportSource: ExportSource = {
    name: d.title || diagram.name,
    docBackground: '#FFFFFF',
    hasSelection: false,
    build: ({ padding, bg }) =>
      mindExportSVG(readMindmap(session.doc, diagram.id, diagram.name), { padding, bg, embedFont: true }),
  };
  const exportJson = async () => {
    const r = readDiagram(session.doc, diagram.id);
    if (!r) return;
    const path = await umlab.files.save({
      defaultName: `${slug(r.name)}.umlab.json`,
      filters: [{ name: 'Sơ đồ UMLab', extensions: ['json'] }],
      data: stringifyFile(toDiagramFile(r, [...modelMap(session.doc).values()])),
    });
    if (path) toast('Đã lưu ' + path.split(/[\\/]/).pop());
  };
  const importJson = async () => {
    const files = await umlab.files.open({ filters: [{ name: 'JSON', extensions: ['json'] }], asText: true });
    if (!files.length) return;
    try {
      const parsed = parseImport(files[0].text ?? '');
      if (parsed.kind !== 'diagram' || parsed.file.diagram.type !== 'mindmap')
        throw new ImportError('Tệp này không phải sơ đồ tư duy.');
      const inc = normMindmap(parsed.file.diagram.data, parsed.file.diagram.name);
      const ok = await confirmDialog({
        title: 'Nhập JSON vào sơ đồ đang mở',
        text: `Tệp “${parsed.file.diagram.name}” có ${inc.nodes.length} node. Thay thế toàn bộ nội dung hiện tại?`,
        confirmLabel: 'Thay thế',
      });
      if (!ok) return;
      ops.replace(inc);
      fitted.current = false;
      setSel(null);
      setDrawer(null);
      toast(`Đã nhập ${inc.nodes.length} node`);
    } catch (e) {
      if (e instanceof ImportError) toast([e.message, ...e.details].join(' · '), { error: true, ms: 8000 });
      else toast(e instanceof Error ? e.message : String(e), { error: true });
    }
  };
  useEffect(() => {
    setActions({
      exportImage: () => setExporting(true),
      exportJson: () => void exportJson(),
      importJson: canEdit ? () => void importJson() : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram.id, canEdit]);

  // ---------- giao diện ----------
  const renameBox = renaming ? L.boxes.get(renaming) : null;
  const renameNode = renaming ? t.byId.get(renaming) : null;
  const stats = useMemo(() => {
    const q = d.nodes.filter((n) => n.kind === 'question').length;
    return { total: d.nodes.length, q, branches: t.children(t.root.id).length };
  }, [d.nodes, t]);
  const jumpHit = (dir: 1 | -1) => {
    if (!hitList.length) return;
    const i = (hitIdx + dir + hitList.length) % hitList.length;
    setHitIdx(i);
    setSel(hitList[i]);
    reveal(hitList[i], true);
  };

  return (
    <div
      className={'mm-root' + (locked ? ' locked' : '')}
      ref={wrap}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        gesture.current = null;
        setDrag(null);
      }}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      data-testid="mindmap"
    >
      <svg className="mm-canvas" width={size.w} height={size.h}>
        <g transform={`translate(${view.tx},${view.ty}) scale(${view.z})`}>
          <MindScene
            d={d}
            L={L}
            P={P}
            st={{ sel, hits, drop: drag?.drop ?? null, dragging: dragIds, interactive: true }}
          />
        </g>
      </svg>

      <div className="mm-bar">
        <div className="mm-bar-group">
          <Button size="sm" variant="primary" icon={<Plus />} disabled={!canEdit} onClick={() => addChild()}>
            Ý con
          </Button>
          <IconButton
            label="Thêm ý cùng cấp"
            shortcut="Enter"
            disabled={!canEdit || !sel || sel === t.root.id}
            onClick={() => addSibling()}
          >
            <GitFork />
          </IconButton>
          <IconButton
            label="Xoá nhánh"
            shortcut="Del"
            disabled={!canEdit || !sel || sel === t.root.id}
            onClick={() => void remove()}
          >
            <Trash2 />
          </IconButton>
        </div>
        <div className="mm-bar-group">
          <IconButton
            label={
              d.layout === 'both' ? 'Bố cục: hai phía (đổi sang một phía)' : 'Bố cục: một phía (đổi sang hai phía)'
            }
            disabled={!canEdit}
            onClick={() => {
              ops.setMeta({ layout: d.layout === 'both' ? 'right' : 'both' });
              requestAnimationFrame(fit);
            }}
          >
            <ListTree />
          </IconButton>
          <IconButton label="Sắp xếp lại tự động" disabled={!canEdit} onClick={resetPositions}>
            <Wand2 />
          </IconButton>
          <IconButton label="Thu gọn về nhánh chính" disabled={readOnly} onClick={() => collapseLevel(1)}>
            <ChevronsDownUp />
          </IconButton>
          <IconButton label="Hiện 2 cấp" disabled={readOnly} onClick={() => collapseLevel(2)}>
            <Sparkles />
          </IconButton>
          <IconButton label="Mở tất cả" disabled={readOnly} onClick={() => collapseLevel(99)}>
            <ChevronsUpDown />
          </IconButton>
          <IconButton
            label="Tài liệu tham khảo"
            active={drawer === 'refs'}
            onClick={() => setDrawer(drawer === 'refs' ? null : 'refs')}
          >
            <BookMarked />
          </IconButton>
        </div>
        <div className="mm-search">
          <Search size={14} />
          <input
            value={query}
            placeholder="Tìm trong sơ đồ (Ctrl+F)"
            onChange={(e) => {
              setQuery(e.target.value);
              setHitIdx(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') jumpHit(e.shiftKey ? -1 : 1);
              if (e.key === 'Escape') {
                setQuery('');
                wrap.current?.focus();
              }
            }}
          />
          {hits && (
            <span className="mm-search-n">{hitList.length ? `${Math.max(0, hitIdx) + 1}/${hitList.length}` : '0'}</span>
          )}
        </div>
        <span className="mm-stats">
          {stats.branches} nhánh · {stats.total} node · {stats.q} câu hỏi
        </span>
        <Button
          size="sm"
          variant={locked ? 'primary' : 'outline'}
          icon={locked ? <Lock /> : <LockOpen />}
          disabled={readOnly}
          onClick={() => {
            ops.setMeta({ locked: !locked });
            setRenaming(null);
            toast(locked ? 'Đã mở khoá — có thể chỉnh sửa' : 'Đã khoá — chỉ xem, không chỉnh sửa');
          }}
          title={locked ? 'Mở khoá để chỉnh sửa' : 'Khoá sơ đồ (chỉ xem)'}
        >
          {locked ? 'Đã khoá' : 'Khoá'}
        </Button>
      </div>

      <div className="mm-zoom" style={{ right: (drawer ? drawerW : 0) + 16 }}>
        <IconButton label="Thu nhỏ" size="sm" onClick={() => zoomAt(view.z / 1.2, availW / 2, size.h / 2)}>
          <Minus />
        </IconButton>
        <button type="button" className="mm-zoom-v" onClick={() => zoomAt(1, availW / 2, size.h / 2)} title="Về 100%">
          {Math.round(view.z * 100)}%
        </button>
        <IconButton label="Phóng to" size="sm" onClick={() => zoomAt(view.z * 1.2, availW / 2, size.h / 2)}>
          <Plus />
        </IconButton>
        <IconButton label="Vừa màn hình (Ctrl+0)" size="sm" onClick={fit}>
          <Maximize />
        </IconButton>
        <IconButton label="Về node trung tâm" size="sm" onClick={() => reveal(t.root.id, true)}>
          <Focus />
        </IconButton>
      </div>

      {renameBox && renameNode && (
        <input
          className="mm-rename"
          autoFocus
          defaultValue={renameNode.title}
          style={{
            left: (renameBox.x - renameBox.w / 2) * view.z + view.tx,
            top: (renameBox.y - renameBox.h / 2) * view.z + view.ty,
            width: Math.max(160, renameBox.w * view.z),
            fontSize: Math.max(12, renameBox.titleSize * view.z),
          }}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => {
            const v = e.currentTarget.value.trim();
            if (v && v !== renameNode.title) ops.setNode(renameNode.id, { title: v });
            setRenaming(null);
            wrap.current?.focus({ preventScroll: true });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              e.currentTarget.value = renameNode.title;
              e.currentTarget.blur();
            }
            e.stopPropagation();
          }}
        />
      )}

      {locked && <div className="mm-lock-badge">Chế độ chỉ xem — bấm “Đã khoá” để chỉnh sửa</div>}

      {drawer && (
        <MindDrawer
          d={d}
          t={t}
          target={drawer}
          locked={!canEdit}
          ops={ops}
          width={drawerW}
          onWidth={setDrawerW}
          onClose={() => {
            setDrawer(null);
            wrap.current?.focus({ preventScroll: true });
          }}
          onNavigate={(id) => open(id)}
        />
      )}
      {exporting && <ExportImageDialog source={exportSource} onClose={() => setExporting(false)} />}
    </div>
  );
}

registerEditor('mindmap', (p) => <MindmapEditor {...p} />);
registerThumbnail('mindmap', (doc, d) => mindThumbSVG(readMindmap(doc, d.id, d.name)));

registerDiagramTemplates('mindmap', [
  {
    id: 'blank',
    label: 'Trống',
    description: 'Chỉ có node trung tâm',
    build: ({ name }) => ({ data: emptyMindmap(name) }),
  },
  {
    id: 'unipark-defense',
    label: 'Kiến thức bảo vệ UniPark+',
    description: 'Chức năng, kiến trúc, AI giám sát, công thức, kết quả, câu hỏi phản biện — theo báo cáo Nhóm 11',
    build: async () => {
      const f = (await import('@fixtures/unipark-mindmap.umlab.json')).default as { diagram: { data: unknown } };
      return { data: normMindmap(f.diagram.data) };
    },
  },
  {
    id: 'unipark-defense-detail',
    label: 'Kiến thức bảo vệ UniPark+ (chi tiết)',
    description: 'Bản chi tiết: thêm nhánh Nghiên cứu khoa học và 10–20 câu hỏi ôn tập có đáp án ở cuối mỗi node',
    build: async () => {
      const f = (await import('@fixtures/unipark-mindmap-chi-tiet.umlab.json')).default as {
        diagram: { data: unknown };
      };
      return { data: normMindmap(f.diagram.data) };
    },
  },
]);
