// Model Explorer (docs/phases/P12-model-explorer.md): cây phần tử mô hình theo loại (Actors, Use Cases, Classes…),
// tìm / lọc, kéo thả vào canvas = view mới cùng modelId, phần tử có trên sơ đồ đang mở in đậm; chuột phải: Xuất hiện ở
// các sơ đồ, Đổi tên (mọi view cập nhật), Xoá khỏi mô hình; dọn phần tử mồ côi.
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Search, Trash2, Waypoints } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';
import {
  MODEL_GROUPS,
  modelGroupOf,
  modelKindLabel,
  modelUsages,
  orphanModels,
  searchKey,
  usageCounts,
  type ModelElement,
} from '@umlab/core';
import { cn } from '@/lib/cn';
import {
  Button,
  Dialog,
  IconButton,
  Select,
  confirmDialog,
  openContextMenu,
  openMenuAt,
  promptDialog,
  toast,
  type MenuEntry,
} from '@/ui';
import { useYVersion } from '../workspace/session';
import { registerModelExplorer } from './engine/canvas-editor';
import type { Engine } from './engine/engine';
import { deleteFromModel } from './engine/ops';
import { UmlIcon } from './engine/palette';
import { useSelectRequest } from './engine/select-request';

const ICON: Record<string, string> = {
  'uml.actor': 'actor',
  'uml.usecase': 'usecase',
  'uml.subject': 'system',
  'uml.class': 'class',
  'uml.associationClass': 'association-class',
  'uml.interface': 'interface',
  'uml.enumeration': 'enumeration',
  'uml.datatype': 'datatype',
  'uml.primitive': 'primitive',
  'uml.signal': 'signal',
  'erd.entity': 'entity',
  'erd.view': 'view',
  'erd.resultset': 'resultset',
  'erd.procedures': 'stored-procedures',
  'erd.triggers': 'triggers',
  'erd.sequence': 'sequence',
  'erd.relationship': 'rel-1-n',
  'uml.activity': 'activity',
  'uml.action': 'action',
  'uml.objectNode': 'object-node',
  'uml.pin': 'input-pin',
  'uml.parameterNode': 'param-node',
  'uml.lifeline': 'lifeline',
  'uml.association': 'association',
  'uml.collaboration': 'collaboration',
  'rest.resource': 'rest-service',
  package: 'package',
};
export const modelIcon = (kind: string) => ICON[kind] ?? 'missing';

const GROUP_LABEL = new Map([...MODEL_GROUPS.map((g) => [g.id, g.label] as const), ['other', 'Khác'] as const]);

/** Dọn phần tử mồ côi: danh sách có chọn + xoá hàng loạt. */
function OrphanDialog({ engine, onClose }: { engine: Engine; onClose: () => void }) {
  const list = useMemo(() => orphanModels(engine.doc), [engine]);
  const [pick, setPick] = useState<Set<string>>(() => new Set(list.map((m) => m.id)));
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Phần tử mồ côi (${list.length})`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 />}
            disabled={!pick.size || engine.readOnly}
            onClick={() => {
              engine.apply((tx) => [...pick].forEach((id) => tx.deleteModel(id)));
              toast(`Đã xoá ${pick.size} phần tử`);
              onClose();
            }}
          >
            Xoá {pick.size} phần tử
          </Button>
        </>
      }
    >
      {!list.length ? (
        <p className="text-muted">Không có phần tử nào mồ côi — mọi phần tử đều còn xuất hiện trên sơ đồ.</p>
      ) : (
        <>
          <p className="mb-2 text-[12.5px] text-muted">
            Các phần tử không còn hình nào trên mọi sơ đồ và không được dữ liệu nào khác tham chiếu.
          </p>
          <div className="grid max-h-[360px] gap-0.5 overflow-auto" role="list" aria-label="Phần tử mồ côi">
            {list.map((m) => (
              <label key={m.id} className="tree-row px-1.5" role="listitem">
                <input
                  type="checkbox"
                  checked={pick.has(m.id)}
                  onChange={(e) => {
                    const n = new Set(pick);
                    if (e.target.checked) n.add(m.id);
                    else n.delete(m.id);
                    setPick(n);
                  }}
                />
                <UmlIcon name={modelIcon(m.kind)} size={14} />
                <span className="nm">{m.name || '(chưa đặt tên)'}</span>
                <span className="text-[11px] text-muted">{modelKindLabel(m.kind)}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </Dialog>
  );
}

export function ModelExplorer({ engine }: { engine: Engine }) {
  const nav = useNavigate();
  const doc = engine.doc;
  const ver = useYVersion(
    doc,
    (n) => n === 'model' || n === 'diagrams' || n.startsWith('views:') || n.startsWith('conns:'),
  );
  const engineVer = useStore(engine.store, (s) => s.version);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [orphans, setOrphans] = useState(false);
  const counts = useMemo(() => usageCounts(doc), [doc, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const onDiagram = useMemo(() => {
    const s = new Set<string>();
    for (const v of engine.lookup.views()) if (v.modelId) s.add(v.modelId);
    for (const c of engine.lookup.conns()) if (c.modelId) s.add(c.modelId);
    return s;
  }, [engine, engineVer]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => {
    const k = searchKey(q);
    const all = engine.lookup
      .allModel()
      .filter(
        (m) =>
          (!k || searchKey(`${m.name} ${String(m.data.code ?? '')}`).includes(k)) &&
          (!kind || modelGroupOf(m.kind) === kind),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    const by = new Map<string, ModelElement[]>();
    for (const m of all) {
      const g = modelGroupOf(m.kind);
      by.set(g, [...(by.get(g) ?? []), m]);
    }
    return [...MODEL_GROUPS.map((g) => g.id), 'other']
      .filter((g) => by.has(g))
      .map((g) => ({ id: g, items: by.get(g)! }));
  }, [engine, q, kind, ver]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (diagramId: string, viewIds: string[], connIds: string[]) => {
    useSelectRequest.getState().set({ diagramId, viewIds, connIds });
    if (diagramId !== engine.diagramId) nav(`/p/${engine.session.projectId}/d/${diagramId}`);
  };

  const menu = (m: ModelElement): MenuEntry[] => {
    const usages = modelUsages(doc, m.id);
    return [
      { type: 'label', label: `${modelKindLabel(m.kind)} · xuất hiện ở ${usages.length} sơ đồ` },
      {
        label: 'Xuất hiện ở các sơ đồ',
        icon: <Waypoints />,
        disabled: !usages.length,
        children: usages.map((u) => ({
          label: `${u.diagram.name} (${u.viewIds.length + u.connIds.length})`,
          onSelect: () => open(u.diagram.id, u.viewIds, u.connIds),
        })),
      },
      {
        label: 'Đổi tên',
        icon: <Pencil />,
        disabled: engine.readOnly,
        onSelect: async () => {
          const name = await promptDialog({ title: 'Đổi tên phần tử', label: 'Tên mới', initial: m.name });
          if (name && name !== m.name) engine.apply((tx) => tx.setModel(m.id, { name }));
        },
      },
      { type: 'sep' },
      {
        label: 'Xoá khỏi mô hình',
        icon: <Trash2 />,
        danger: true,
        disabled: engine.readOnly,
        onSelect: async () => {
          const ok = await confirmDialog({
            title: `Xoá “${m.name}” khỏi mô hình?`,
            text: usages.length ? (
              <>
                Phần tử và mọi hình của nó sẽ bị xoá ở {usages.length} sơ đồ:
                <ul className="mt-1 list-disc pl-5">
                  {usages.map((u) => (
                    <li key={u.diagram.id}>{u.diagram.name}</li>
                  ))}
                </ul>
              </>
            ) : (
              'Phần tử không còn xuất hiện ở sơ đồ nào.'
            ),
            confirmLabel: 'Xoá khỏi mô hình',
            danger: true,
          });
          if (ok) deleteFromModel(engine, [m.id]);
        },
      },
    ];
  };

  const total = groups.reduce((s, g) => s + g.items.length, 0);
  return (
    <div className="flex h-full min-h-0 flex-col" role="region" aria-label="Model Explorer">
      <div className="grid gap-1.5 p-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted" />
          <input
            className="field"
            style={{ paddingLeft: 26, height: 30 }}
            placeholder="Tìm phần tử…"
            aria-label="Tìm phần tử mô hình"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select
          aria-label="Lọc theo loại"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          options={[
            { value: '', label: 'Mọi loại phần tử' },
            ...[...MODEL_GROUPS.map((g) => g.id), 'other'].map((g) => ({ value: g, label: GROUP_LABEL.get(g)! })),
          ]}
        />
      </div>
      <div className="scroll min-h-0 flex-1 px-1.5 pb-2" role="tree" aria-label="Phần tử mô hình">
        {!total && (
          <p className="px-2 text-muted">
            {q || kind ? 'Không có phần tử phù hợp.' : 'Project chưa có phần tử mô hình.'}
          </p>
        )}
        {groups.map((g) => {
          const isClosed = closed.has(g.id);
          return (
            <div key={g.id} role="group">
              <div
                className="tree-row px-1 font-semibold"
                role="treeitem"
                aria-expanded={!isClosed}
                onClick={() => {
                  const n = new Set(closed);
                  if (isClosed) n.delete(g.id);
                  else n.add(g.id);
                  setClosed(n);
                }}
              >
                <span className="tree-twist">{isClosed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</span>
                <span className="nm">{GROUP_LABEL.get(g.id)}</span>
                <span className="text-[11px] font-normal text-muted">{g.items.length}</span>
              </div>
              {!isClosed &&
                g.items.map((m) => {
                  const here = onDiagram.has(m.id);
                  const n = counts.get(m.id) ?? 0;
                  return (
                    <div
                      key={m.id}
                      className="tree-row"
                      style={{ paddingLeft: 22 }}
                      role="treeitem"
                      data-model={m.id}
                      draggable={!engine.readOnly}
                      title={`${modelKindLabel(m.kind)} — ${n ? `xuất hiện ở ${n} sơ đồ` : 'chưa có trên sơ đồ nào'}${engine.readOnly ? '' : ' · kéo vào canvas để thêm'}`}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/x-umlab-model', m.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => {
                        const ids = engine.lookup
                          .views()
                          .filter((v) => v.modelId === m.id)
                          .map((v) => v.id);
                        const cs = engine.lookup
                          .conns()
                          .filter((c) => c.modelId === m.id)
                          .map((c) => c.id);
                        if (ids.length || cs.length) engine.select(ids, cs);
                      }}
                      onDoubleClick={() => {
                        const u = modelUsages(doc, m.id)[0];
                        if (u) open(u.diagram.id, u.viewIds, u.connIds);
                      }}
                      onContextMenu={(e) => openContextMenu(e, menu(m))}
                    >
                      <UmlIcon name={modelIcon(m.kind)} size={14} />
                      <span className={cn('nm', here && 'font-semibold')} style={{ opacity: n ? 1 : 0.6 }}>
                        {String(m.data.code ?? '') ? `${String(m.data.code)} ` : ''}
                        {m.name || '(chưa đặt tên)'}
                      </span>
                      {n > 1 && <span className="text-[10.5px] text-muted">{n}</span>}
                      <IconButton
                        label={`Thao tác ${m.name}`}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMenuAt(e.currentTarget, menu(m), 'end');
                        }}
                      >
                        <MoreHorizontal />
                      </IconButton>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1 border-t border-line p-2 text-[11.5px] text-muted">
        <span className="flex-1">{total} phần tử · in đậm = có trên sơ đồ này</span>
        <Button size="sm" variant="outline" onClick={() => setOrphans(true)}>
          Mồ côi…
        </Button>
      </div>
      {orphans && <OrphanDialog engine={engine} onClose={() => setOrphans(false)} />}
    </div>
  );
}

registerModelExplorer(ModelExplorer);
