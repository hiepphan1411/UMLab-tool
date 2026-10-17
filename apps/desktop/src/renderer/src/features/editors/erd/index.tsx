// Sơ đồ cơ sở dữ liệu (`erd`) — docs/phases/P09-erd.md, docs/spec/notation-erd.md.
import { FileCode2 } from 'lucide-react';
import { useStore } from 'zustand';
import { DIALECTS, diagramsMap, isDialect, type Dialect } from '@umlab/core';
import { Button } from '@/ui';
import { LOCAL } from '../../workspace/session';
import { registerDiagramTemplates, registerEditor } from '../editor-registry';
import { CanvasEditor } from '../engine/canvas-editor';
import type { Engine } from '../engine/engine';
import { registerPalette, registerRules } from '../engine/registry';
import { COMMON_PALETTE_GROUPS } from '../shapes/common';
import './table';
import './others';
import './connectors';
import { openDdlDialog } from './ddl-dialog';
import { EntityInspector, ViewInspector } from './inspector';
import { dialectOf } from './ops';
import { ERD_RULES } from './rules';
import { getShape } from '../engine/registry';
import { unipkErdTemplate } from './template';

// Inspector riêng (gắn sau khi đăng ký hình để tránh vòng import table ↔ inspector)
for (const [type, comp] of [
  ['erd.entity', EntityInspector],
  ['erd.view', ViewInspector],
] as const) {
  const def = getShape(type);
  if (def) def.inspector = comp;
}

const commonC = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-c')!;
const commonD = COMMON_PALETTE_GROUPS.find((g) => g.id === 'common-d')!;

registerPalette('erd', [
  {
    id: 'erd',
    items: [{ id: 'erd.entity' }, { id: 'erd.rel11' }, { id: 'erd.rel1n' }, { id: 'erd.relnn' }],
  },
  {
    id: 'erd-db',
    items: [
      { id: 'erd.view' },
      { id: 'erd.procedures' },
      { id: 'erd.resultset' },
      { id: 'erd.triggers' },
      { id: 'erd.sequence' },
    ],
  },
  { id: 'erd-notes', items: [{ id: 'common.note' }, { id: 'common.anchor' }, { id: 'common.constraint' }] },
  { ...commonC, label: undefined },
  { ...commonD, label: undefined },
]);

registerRules('erd', ERD_RULES);

registerDiagramTemplates('erd', [
  { id: 'blank', label: 'Trống', description: 'Bắt đầu với khung vẽ trống (PostgreSQL)', build: () => ({}) },
  {
    id: 'unipark',
    label: 'ERD UniPark+',
    description:
      'Sinh từ Class UniPark+: user, sinh_vien, xe, the_rfid, phien_gui_xe, goi_thang, vi_dien_tu, giao_dich…',
    build: () => unipkErdTemplate(),
  },
]);

function setDialect(e: Engine, dialect: Dialect) {
  e.doc.transact(() => {
    const m = diagramsMap(e.doc).get(e.diagramId);
    if (m) diagramsMap(e.doc).set(e.diagramId, { ...m, canvas: { ...m.canvas, dialect } });
  }, LOCAL);
}

function ErdToolbar({ e }: { e: Engine }) {
  useStore(e.store, (s) => s.metaVersion);
  const dialect = dialectOf(e.lookup);
  return (
    <>
      <select
        className="field"
        style={{ height: 30, width: 128 }}
        aria-label="Dialect SQL"
        title="Dialect SQL của sơ đồ (kiểu cột, từ khoá, DDL)"
        value={dialect}
        disabled={e.readOnly}
        onChange={(ev) => isDialect(ev.target.value) && setDialect(e, ev.target.value)}
      >
        {DIALECTS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      <Button size="sm" variant="outline" icon={<FileCode2 />} onClick={() => openDdlDialog(e, e.meta?.name ?? 'erd')}>
        Xuất SQL
      </Button>
    </>
  );
}

registerEditor('erd', (p) => <CanvasEditor {...p} options={{ toolbar: (e) => <ErdToolbar e={e} /> }} />);
