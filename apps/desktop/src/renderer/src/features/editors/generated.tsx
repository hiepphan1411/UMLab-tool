// Sơ đồ sinh từ đặc tả use case (docs/spec/generators.md mục 0): tạo, sinh lại (Ghi đè — Undo được / Tạo phiên bản
// mới), banner "Sinh từ đặc tả…", bỏ liên kết, liên kết 2 chiều bước đặc tả ↔ hình (props.sourceStepId).
import { FileText, Link2Off, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';
import { create } from 'zustand';
import type * as Y from 'yjs';
import {
  connsMap,
  createDiagram,
  diagramsMap,
  modelMap,
  readSpec,
  updateDiagramMeta,
  uniqueName,
  viewsMap,
  writeContent,
  type DiagramMeta,
  type DiagramType,
  type ModelElement,
  type UseCaseSpec,
} from '@umlab/core';
import { Button, choiceDialog, toast } from '@/ui';
import { LOCAL } from '../workspace/session';
import type { DiagramInit } from './editor-registry';
import type { Engine } from './engine/engine';

export type GeneratorId = 'spec-activity@1' | 'spec-sequence@1';
export interface GeneratorDef {
  id: GeneratorId;
  type: DiagramType;
  /** Tiền tố tên sơ đồ: "Activity - UC03 Check-in xe vào bãi". */
  prefix: string;
  build: (doc: Y.Doc, spec: UseCaseSpec) => DiagramInit;
}

const ucLabel = (doc: Y.Doc, spec: UseCaseSpec) => {
  const uc = modelMap(doc).get(spec.useCaseId);
  return `${typeof uc?.data.code === 'string' ? uc.data.code : ''} ${uc?.name ?? ''}`.trim() || 'Use case';
};

/** Sơ đồ đã sinh từ đặc tả `specId` (theo loại generator). */
export function generatedFrom(doc: Y.Doc, specId: string, gen?: GeneratorId): DiagramMeta[] {
  return [...diagramsMap(doc).values()].filter(
    (d) => d.generatedFrom?.sourceDiagramId === specId && (!gen || d.generatedFrom.generator === gen),
  );
}

/** Sinh sơ đồ mới cạnh đặc tả. Trả về id sơ đồ. */
export function generateNew(doc: Y.Doc, specId: string, g: GeneratorDef, version = false): string {
  const spec = readSpec(doc, specId);
  const meta = diagramsMap(doc).get(specId);
  const init = g.build(doc, spec);
  const base = `${g.prefix} - ${ucLabel(doc, spec)}`;
  const siblings = [...diagramsMap(doc).values()]
    .filter((d) => d.folderId === (meta?.folderId ?? null))
    .map((d) => d.name);
  let name = base;
  if (version) for (let i = 2; siblings.includes(name); i++) name = `${base} v${i}`;
  else name = uniqueName(siblings, base);
  return createDiagram(doc, g.type, name, meta?.folderId ?? null, LOCAL, {
    ...init,
    generatedFrom: { sourceDiagramId: specId, sourceVersion: spec.version, generator: g.id },
  });
}

/** Ghi đè nội dung sơ đồ đã sinh (một giao dịch LOCAL → Undo được). Dọn phần tử mô hình chỉ sơ đồ này dùng. */
export function regenerateInto(doc: Y.Doc, diagramId: string, g: GeneratorDef): void {
  const meta = diagramsMap(doc).get(diagramId);
  const specId = meta?.generatedFrom?.sourceDiagramId;
  if (!meta || !specId) return;
  const spec = readSpec(doc, specId);
  const init = g.build(doc, spec);
  const oldModel = new Set(
    [...viewsMap(doc, diagramId).values(), ...connsMap(doc, diagramId).values()]
      .map((x) => x.modelId)
      .filter(Boolean) as string[],
  );
  doc.transact(() => {
    writeContent(doc, diagramId, g.type, { views: init.views ?? [], connectors: init.connectors ?? [] });
    for (const m of init.model ?? []) modelMap(doc).set(m.id, m as ModelElement);
    // phần tử cũ không còn hình nào ở mọi sơ đồ → xoá
    const used = new Set<string>();
    for (const d of diagramsMap(doc).values())
      for (const x of [...viewsMap(doc, d.id).values(), ...connsMap(doc, d.id).values()])
        if (x.modelId) used.add(x.modelId);
    for (const id of oldModel) if (!used.has(id)) modelMap(doc).delete(id);
    updateDiagramMeta(doc, diagramId, { generatedFrom: { ...meta.generatedFrom!, sourceVersion: spec.version } });
  }, LOCAL);
}

/** Hỏi Ghi đè / Phiên bản mới / Huỷ rồi sinh lại. Trả về id sơ đồ cần mở (mới) nếu có. */
export async function askRegenerate(doc: Y.Doc, diagramId: string, g: GeneratorDef): Promise<string | null> {
  const choice = await choiceDialog({
    title: 'Sinh lại từ đặc tả',
    text: 'Ghi đè sẽ thay toàn bộ nội dung sơ đồ (mất chỉnh sửa tay — có thể Undo). Hoặc tạo một sơ đồ phiên bản mới bên cạnh.',
    options: [
      { value: 'version', label: 'Tạo phiên bản mới', variant: 'outline' },
      { value: 'overwrite', label: 'Ghi đè', variant: 'primary' },
    ],
  });
  if (choice === 'overwrite') {
    regenerateInto(doc, diagramId, g);
    toast('Đã sinh lại từ đặc tả');
    return null;
  }
  if (choice === 'version') {
    const specId = diagramsMap(doc).get(diagramId)?.generatedFrom?.sourceDiagramId;
    return specId ? generateNew(doc, specId, g, true) : null;
  }
  return null;
}

// ---------------- chuyển tiêu điểm giữa đặc tả ↔ sơ đồ sinh ra ----------------

interface FocusReq {
  diagramId: string;
  stepId: string;
}
export const useFocusRequest = create<{ req: FocusReq | null; set: (r: FocusReq | null) => void }>((set) => ({
  req: null,
  set: (req) => set({ req }),
}));

/** Lấy (và xoá) yêu cầu tiêu điểm cho sơ đồ `diagramId`. */
export function takeFocus(diagramId: string): string | null {
  const r = useFocusRequest.getState().req;
  if (!r || r.diagramId !== diagramId) return null;
  useFocusRequest.getState().set(null);
  return r.stepId;
}

/** Banner trên canvas của sơ đồ sinh ra. */
export function GeneratedBanner({ e, g, open }: { e: Engine; g: GeneratorDef; open: (id: string) => void }) {
  useStore(e.store, (s) => s.metaVersion);
  const meta = e.meta;
  const gf = meta?.generatedFrom;
  if (!gf || gf.generator !== g.id) return null;
  const spec = diagramsMap(e.doc).get(gf.sourceDiagramId);
  if (!spec) return null;
  const cur = readSpec(e.doc, gf.sourceDiagramId);
  const changed = cur.version > gf.sourceVersion;
  return (
    <div className={changed ? 'gen-banner changed' : 'gen-banner'} role="status" data-testid="gen-banner">
      <span>
        Sinh từ{' '}
        <button className="linklike" onClick={() => open(gf.sourceDiagramId)}>
          {spec.name}
        </button>{' '}
        · phiên bản {gf.sourceVersion}
        {changed && <b> · Đặc tả đã thay đổi (phiên bản {cur.version})</b>}
      </span>
      {!e.readOnly && (
        <>
          <Button
            size="sm"
            variant={changed ? 'primary' : 'outline'}
            icon={<RefreshCw />}
            onClick={async () => {
              const id = await askRegenerate(e.doc, e.diagramId, g);
              if (id) open(id);
            }}
          >
            Sinh lại
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<Link2Off />}
            onClick={() => updateDiagramMeta(e.doc, e.diagramId, { generatedFrom: null }, LOCAL)}
          >
            Bỏ liên kết
          </Button>
        </>
      )}
    </div>
  );
}

/** Chọn các hình / đường nối sinh từ bước `stepId` (đi từ đặc tả sang). */
export function FocusStep({ e }: { e: Engine }) {
  const req = useStore(useFocusRequest, (s) => s.req);
  useEffect(() => {
    const stepId = takeFocus(e.diagramId);
    if (!stepId) return;
    const ids = e.lookup
      .views()
      .filter((v) => v.props.sourceStepId === stepId)
      .map((v) => v.id);
    const conns = e.lookup
      .conns()
      .filter((c) => c.props.sourceStepId === stepId)
      .map((c) => c.id);
    if (ids.length || conns.length) e.select(ids, conns);
  }, [req, e]);
  return null;
}

/** Inspector phụ: hình / message sinh từ bước đặc tả → mở đặc tả tại bước đó. */
export function StepLink({ e }: { e: Engine }) {
  const nav = useNavigate();
  const sel = useStore(e.store, (s) => s.sel);
  const selConns = useStore(e.store, (s) => s.selConns);
  const gf = e.meta?.generatedFrom;
  if (sel.size + selConns.size !== 1 || !gf) return null;
  const x = sel.size ? e.lookup.view([...sel][0]) : e.lookup.conn([...selConns][0]);
  const stepId = typeof x?.props.sourceStepId === 'string' ? x.props.sourceStepId : null;
  if (!stepId) return null;
  return (
    <div className="pgroup">
      <Button
        variant="outline"
        icon={<FileText />}
        onClick={() => {
          useFocusRequest.getState().set({ diagramId: gf.sourceDiagramId, stepId });
          nav(`/p/${e.session.projectId}/d/${gf.sourceDiagramId}`);
        }}
      >
        Xem bước trong đặc tả
      </Button>
    </div>
  );
}
