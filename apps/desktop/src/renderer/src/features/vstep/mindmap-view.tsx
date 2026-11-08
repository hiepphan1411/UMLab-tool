import { Download, Maximize2, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { stringifyFile, toDiagramFile, type DiagramRecord, type MindmapData } from '@umlab/core';
import { umlab } from '@/lib/api';
import { Button, IconButton, toast } from '@/ui';
import { computeLayout, hitNode } from '../editors/mindmap/layout';
import { MindScene, useMindPal } from '../editors/mindmap/scene';
import { MIND_DETAIL, VSTEP_MINDMAP } from './content/mindmap';
import { Drawer } from './layout';
import { Rich } from './rich';

export function MindmapView() {
  const [data, setData] = useState<MindmapData>(VSTEP_MINDMAP);
  const L = useMemo(() => computeLayout(data), [data]);
  const P = useMindPal();
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ tx: 0, ty: 0, z: 0.8 });
  const [sel, setSel] = useState<string | null>('root');
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  const fit = () => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const z = Math.min(1.1, (r.width - 40) / Math.max(1, L.bounds.w), (r.height - 40) / Math.max(1, L.bounds.h));
    setView({
      z,
      tx: r.width / 2 - (L.bounds.x + L.bounds.w / 2) * z,
      ty: r.height / 2 - (L.bounds.y + L.bounds.h / 2) * z,
    });
  };
  useEffect(fit, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      setView((v) => {
        const z = Math.min(2.5, Math.max(0.2, v.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        return { z, tx: mx - ((mx - v.tx) * z) / v.z, ty: my - ((my - v.ty) * z) / v.z };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const toWorld = (e: PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.tx) / view.z, y: (e.clientY - r.top - view.ty) / view.z };
  };

  const onUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) return;
    const p = toWorld(e);
    const id = hitNode(L, p.x, p.y);
    if (!id) return;
    setSel(id);
    const hasKids = data.nodes.some((n) => n.parentId === id);
    if (hasKids && id !== 'root')
      setData((dd) => ({ ...dd, nodes: dd.nodes.map((n) => (n.id === id ? { ...n, collapsed: !n.collapsed } : n)) }));
  };

  const setAll = (collapsed: boolean) =>
    setData((dd) => ({
      ...dd,
      nodes: dd.nodes.map((n) =>
        n.kind === 'topic' && dd.nodes.some((c) => c.parentId === n.id) ? { ...n, collapsed } : n,
      ),
    }));

  const exportFile = async () => {
    const now = new Date().toISOString();
    const rec: DiagramRecord = {
      id: 'dg_vstep_b1_mindmap',
      type: 'mindmap',
      name: 'VSTEP B1 - lộ trình đậu',
      folderId: null,
      order: 0,
      createdAt: now,
      updatedAt: now,
      generatedFrom: null,
      canvas: { background: '#FFFFFF', grid: false },
      views: [],
      connectors: [],
      data: { ...VSTEP_MINDMAP, locked: false },
    };
    const path = await umlab.files.save({
      defaultName: 'vstep-b1-mindmap.umlab.json',
      filters: [{ name: 'Sơ đồ UMLab', extensions: ['json'] }],
      data: stringifyFile(toDiagramFile(rec, [], now)),
    });
    if (path) toast('Đã xuất. Mở một project → Nhập sơ đồ để chỉnh sửa như mindmap thường.');
  };

  const node = data.nodes.find((n) => n.id === sel);
  const detail = sel ? MIND_DETAIL.get(sel) : undefined;

  return (
    <div className="vs-mm">
      <div className="vs-mm-canvas" ref={box}>
        <div className="vs-mm-tools">
          <IconButton label="Thu nhỏ" size="sm" onClick={() => setView((v) => ({ ...v, z: Math.max(0.2, v.z / 1.2) }))}>
            <Minus size={14} />
          </IconButton>
          <IconButton
            label="Phóng to"
            size="sm"
            onClick={() => setView((v) => ({ ...v, z: Math.min(2.5, v.z * 1.2) }))}
          >
            <Plus size={14} />
          </IconButton>
          <IconButton label="Vừa khung" size="sm" onClick={fit}>
            <Maximize2 size={14} />
          </IconButton>
          <Button size="sm" variant="outline" onClick={() => setAll(false)}>
            Mở hết
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAll(true)}>
            Thu gọn
          </Button>
          <Button size="sm" variant="outline" icon={<Download />} onClick={() => void exportFile()}>
            Xuất .umlab.json
          </Button>
        </div>
        <svg
          width="100%"
          height="100%"
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
            if (d.moved) setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
          }}
          onPointerUp={onUp}
          style={{ cursor: 'grab' }}
        >
          <g transform={`translate(${view.tx},${view.ty}) scale(${view.z})`}>
            <MindScene d={data} L={L} P={P} st={{ sel, interactive: true }} />
          </g>
        </svg>
      </div>
      <Drawer
        id="mindmap"
        title={node?.title ?? 'Chi tiết'}
        open={!!node}
        onClose={() => setSel(null)}
        defaultWidth={440}
      >
        {node && (
          <>
            {node.summary && <p className="text-muted">{node.summary}</p>}
            {detail ? (
              <Rich src={detail} />
            ) : (
              <p className="text-muted">Bấm vào nhánh để mở/thu gọn; bấm vào mục lá để xem nội dung.</p>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
