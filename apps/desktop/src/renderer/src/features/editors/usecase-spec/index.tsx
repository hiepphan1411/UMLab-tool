// Đặc tả Use Case (`usecase-spec`) — docs/phases/P07-usecase-spec.md, docs/spec/usecase-spec-template.md.
// Không có canvas: dữ liệu ở `data:<id>` (mỗi trường cấp 1 một khoá), logic nằm ở core/spec.
import { AlertCircle, AlertTriangle, FileDown, FileText, Info, Plus, Table2, Trash2, Workflow, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from 'zustand';
import type * as Y from 'yjs';
import {
  addFlow,
  deriveFromDiagrams,
  diagramsMap,
  editFlowSteps,
  importIntoDiagram,
  insertStep,
  metaMap,
  modelMap,
  moveStep,
  newStep,
  nextPerformer,
  parseImport,
  readDiagram,
  readSpec,
  removeFlow,
  removeStep,
  specContext,
  stringifyFile,
  toDiagramFile,
  uid,
  updateFlow,
  updateStep,
  validateSpec,
  connsMap,
  viewsMap,
  writeSpec,
  ImportError,
  type Flow,
  type ModelElement,
  type SpecIssue,
  type Step,
  type UseCaseSpec,
} from '@umlab/core';
import { umlab } from '@/lib/api';
import { cn } from '@/lib/cn';
import { slug } from '@/lib/format';
import { Button, Segmented, Select, confirmDialog, openMenuAt, toast, type MenuEntry } from '@/ui';
import { ImageAttachments } from '../../media/image-attachments';
import { LOCAL } from '../../workspace/session';
import { registerDiagramTemplates, registerEditor, type EditorProps } from '../editor-registry';
import { ACTIVITY_GENERATOR } from '../activity';
import { SEQUENCE_GENERATOR } from '../sequence';
import { generateNew, generatedFrom, takeFocus, useFocusRequest, type GeneratorDef } from '../generated';
import { registerThumbnail } from '../thumbnails';
import { exportSpecMarkdown, exportSpecsDocx } from './exporters';
import { FlowTable, type Option } from './flow-table';
import { openSpecReport } from './report-dialog';

/** Origin của ghi tự động (include/extend rút từ sơ đồ) — không đưa vào undo. */
const DERIVED = 'derived';

type Doc = EditorProps['session']['doc'];

function useDocVersion(doc: Doc): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    // đặc tả + use case + quan hệ trên các Use Case Diagram đều có thể đổi → đọc lại sau mỗi transaction
    const bump = () => setV((x) => x + 1);
    doc.on('afterTransaction', bump);
    return () => doc.off('afterTransaction', bump);
  }, [doc]);
  return v;
}

// ---------------- ô nhập nhỏ ----------------

function Txt({
  value,
  onCommit,
  rows,
  placeholder,
  readOnly,
  label,
}: {
  value: string;
  onCommit: (v: string) => void;
  rows?: number;
  placeholder?: string;
  readOnly?: boolean;
  label: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const p = {
    className: 'field',
    value: v,
    readOnly,
    placeholder,
    'aria-label': label,
    onChange: (e: { target: { value: string } }) => setV(e.target.value),
    onBlur: () => v !== value && onCommit(v),
  };
  return rows ? (
    <textarea rows={rows} {...p} style={{ fieldSizing: 'content', minHeight: rows * 20 + 12 } as React.CSSProperties} />
  ) : (
    <input {...p} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
  );
}

/** Danh sách dòng chữ (tiền/hậu điều kiện): Enter thêm dòng, xoá bằng ×. */
function LinesEditor({
  items,
  onChange,
  placeholder,
  readOnly,
  label,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  readOnly: boolean;
  label: string;
}) {
  const [draft, setDraft] = useState('');
  return (
    <div className="grid gap-1.5" aria-label={label}>
      {items.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 text-right text-muted tabular-nums">{i + 1}.</span>
          <div className="min-w-0 flex-1">
            <Txt
              label={`${label} ${i + 1}`}
              value={t}
              readOnly={readOnly}
              onCommit={(v) =>
                onChange(v.trim() ? items.map((x, j) => (j === i ? v : x)) : items.filter((_, j) => j !== i))
              }
            />
          </div>
          {!readOnly && (
            <button className="ibtn sm" aria-label="Xoá dòng" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <X />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <span className="w-5" />
          <input
            className="field"
            placeholder={placeholder}
            value={draft}
            aria-label={`Thêm ${label.toLowerCase()}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                onChange([...items, draft.trim()]);
                setDraft('');
              }
            }}
            onBlur={() => {
              if (draft.trim()) {
                onChange([...items, draft.trim()]);
                setDraft('');
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Danh sách có mã tự đánh (BR01, NFR01…). */
function CodedEditor({
  items,
  prefix,
  onChange,
  readOnly,
  placeholder,
}: {
  items: { code: string; text: string }[];
  prefix: string;
  onChange: (v: { code: string; text: string }[]) => void;
  readOnly: boolean;
  placeholder: string;
}) {
  const recode = (xs: { code: string; text: string }[]) =>
    xs.map((x, i) => ({ ...x, code: `${prefix}${String(i + 1).padStart(2, '0')}` }));
  return (
    <LinesEditorCoded
      items={items}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(xs) => onChange(recode(xs))}
      prefix={prefix}
    />
  );
}
function LinesEditorCoded({
  items,
  onChange,
  readOnly,
  placeholder,
  prefix,
}: {
  items: { code: string; text: string }[];
  onChange: (v: { code: string; text: string }[]) => void;
  readOnly: boolean;
  placeholder: string;
  prefix: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, { code: '', text: draft.trim() }]);
    setDraft('');
  };
  return (
    <div className="grid gap-1.5">
      {items.map((x, i) => (
        <div key={x.code + i} className="flex items-center gap-2">
          <span className="w-14 font-semibold tabular-nums">{x.code}</span>
          <div className="min-w-0 flex-1">
            <Txt
              label={x.code}
              value={x.text}
              readOnly={readOnly}
              onCommit={(t) =>
                onChange(
                  t.trim() ? items.map((y, j) => (j === i ? { ...y, text: t } : y)) : items.filter((_, j) => j !== i),
                )
              }
            />
          </div>
          {!readOnly && (
            <button
              className="ibtn sm"
              aria-label={`Xoá ${x.code}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <X />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <span className="w-14 text-muted">{`${prefix}${String(items.length + 1).padStart(2, '0')}`}</span>
          <input
            className="field"
            placeholder={placeholder}
            value={draft}
            aria-label={`Thêm ${prefix}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            onBlur={add}
          />
        </div>
      )}
    </div>
  );
}

/** Chọn nhiều actor (chip). */
function ActorChips({
  ids,
  actors,
  onChange,
  readOnly,
  label,
}: {
  ids: string[];
  actors: ModelElement[];
  onChange: (v: string[]) => void;
  readOnly: boolean;
  label: string;
}) {
  const rest = actors.filter((a) => !ids.includes(a.id));
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={label}>
      {ids.map((id) => (
        <span key={id} className="chip">
          {actors.find((a) => a.id === id)?.name ?? '(actor đã xoá)'}
          {!readOnly && (
            <button aria-label="Bỏ" onClick={() => onChange(ids.filter((x) => x !== id))}>
              <X size={12} />
            </button>
          )}
        </span>
      ))}
      {!readOnly && rest.length > 0 && (
        <div style={{ width: 170 }}>
          <Select
            value=""
            aria-label={`Thêm ${label.toLowerCase()}`}
            onChange={(e) => e.target.value && onChange([...ids, e.target.value])}
            options={[{ value: '', label: '+ Thêm actor…' }, ...rest.map((a) => ({ value: a.id, label: a.name }))]}
          />
        </div>
      )}
      {!ids.length && readOnly && <span className="text-muted">—</span>}
    </div>
  );
}

function Section({
  id,
  title,
  children,
  right,
}: {
  id: string;
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="spec-sec" id={'sec-' + id} data-section={id}>
      <div className="spec-sec-h">
        <h2>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const SECTIONS: [string, string][] = [
  ['general', 'Thông tin chung'],
  ['actors', 'Tác nhân'],
  ['conditions', 'Điều kiện'],
  ['mainFlow', 'Luồng chính'],
  ['alternativeFlows', 'Luồng thay thế'],
  ['exceptionFlows', 'Luồng ngoại lệ'],
  ['rules', 'Quy tắc nghiệp vụ'],
  ['nfr', 'Phi chức năng'],
  ['data', 'Màn hình & dữ liệu'],
];

/** Sinh / mở sơ đồ sinh từ đặc tả (Activity, Sequence). */
function GenButton({ doc, specId, g, readOnly }: { doc: Y.Doc; specId: string; g: GeneratorDef; readOnly: boolean }) {
  const nav = useNavigate();
  const { projectId } = useParams();
  const open = (id: string) => nav(`/p/${projectId}/d/${id}`);
  const existing = generatedFrom(doc, specId, g.id);
  const label = `${existing.length ? 'Mở' : 'Sinh'} ${g.prefix}`;
  return (
    <Button
      size="sm"
      variant="outline"
      icon={<Workflow />}
      disabled={readOnly && !existing.length}
      title={
        existing.length
          ? `Đã sinh: ${existing.map((d) => d.name).join(', ')}`
          : `Sinh ${g.prefix} Diagram từ đặc tả này`
      }
      onClick={(e) => {
        if (!existing.length) return open(generateNew(doc, specId, g));
        if (existing.length === 1 && readOnly) return open(existing[0].id);
        openMenuAt(e.currentTarget, [
          ...existing.map((d) => ({ label: `Mở “${d.name}”`, onSelect: () => open(d.id) })),
          ...(readOnly
            ? []
            : [
                { type: 'sep' as const },
                {
                  label: `Sinh ${g.prefix} mới (phiên bản khác)`,
                  onSelect: () => open(generateNew(doc, specId, g, true)),
                },
              ]),
        ]);
      }}
    >
      {label}
    </Button>
  );
}

// ---------------- editor ----------------

export function SpecEditor({ session, diagram, readOnly, setActions }: EditorProps) {
  const doc = session.doc;
  const ver = useDocVersion(doc);
  // mọi dữ liệu đọc từ Y.Doc, tính lại sau mỗi transaction (ver)
  const { spec, uc, ctx, derived, actors, useCases, classes } = useMemo(() => {
    const spec = readSpec(doc, diagram.id);
    const uc = spec.useCaseId ? modelMap(doc).get(spec.useCaseId) : undefined;
    const all = [...modelMap(doc).values()];
    return {
      spec,
      uc,
      ctx: specContext(doc, spec),
      derived: uc ? deriveFromDiagrams(doc, uc.id) : null,
      actors: all.filter((m) => m.kind === 'uml.actor').sort((a, b) => a.name.localeCompare(b.name, 'vi')),
      useCases: all
        .filter((m) => m.kind === 'uml.usecase')
        .sort((a, b) => String(a.data.code).localeCompare(String(b.data.code), 'vi', { numeric: true })),
      classes: all.filter((m) => m.kind === 'uml.class'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, diagram.id, ver]);
  const issues = useMemo(() => validateSpec(spec, { hasUseCase: !!uc }), [spec, uc]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const nav = useNavigate();
  // đi từ sơ đồ sinh ra sang: tô và cuộn tới bước tương ứng
  const focusReq = useStore(useFocusRequest, (x) => x.req);
  useEffect(() => {
    const stepId = takeFocus(diagram.id);
    if (!stepId) return;
    setFocusId(stepId);
    requestAnimationFrame(() =>
      document.querySelector(`[data-step="${stepId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    );
  }, [focusReq, diagram.id]);
  /** Menu ⋯ của bước: Xem trên các sơ đồ sinh ra có hình của bước này. */
  const stepMenu = (st: Step): MenuEntry[] =>
    generatedFrom(doc, diagram.id)
      .filter((d) =>
        [...viewsMap(doc, d.id).values(), ...connsMap(doc, d.id).values()].some((v) => v.props.sourceStepId === st.id),
      )
      .map((d) => ({
        label: `Xem trên “${d.name}”`,
        onSelect: () => {
          useFocusRequest.getState().set({ diagramId: d.id, stepId: st.id });
          nav(`/p/${session.projectId}/d/${d.id}`);
        },
      }));
  const [showIssues, setShowIssues] = useState(false);
  const center = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState('general');

  const write = (fn: (s: UseCaseSpec) => UseCaseSpec, origin: unknown = LOCAL) => {
    if (readOnly) return;
    writeSpec(doc, diagram.id, fn(readSpec(doc, diagram.id)), origin);
  };
  const setField = <K extends keyof UseCaseSpec>(k: K, v: UseCaseSpec[K]) => write((s) => ({ ...s, [k]: v }));

  // include/extend rút từ sơ đồ (chỉ đọc); actor tự điền khi đặc tả chưa có actor nào
  useEffect(() => {
    if (readOnly || !derived) return;
    write((s) => {
      const n = { ...s, includes: derived.includes, extends: derived.extends };
      if (!s.primaryActors.length && !s.secondaryActors.length) {
        n.primaryActors = derived.primary;
        n.secondaryActors = derived.secondary;
      }
      return n;
    }, DERIVED);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(derived), readOnly]);

  // tên sơ đồ theo mã + tên use case
  useEffect(() => {
    if (readOnly || !uc) return;
    const want = `Đặc tả ${ctx.code} ${ctx.name}`.replace(/\s+/g, ' ').trim();
    const m = diagramsMap(doc).get(diagram.id);
    // chỉ đổi tên tự động khi tên vẫn theo mẫu "Đặc tả …" (người dùng đặt tên khác thì giữ)
    if (m && m.name !== want && /^Đặc tả(\s|$)/.test(m.name))
      doc.transact(() => diagramsMap(doc).set(diagram.id, { ...m, name: want }), DERIVED);
  }, [ctx.code, ctx.name, uc, readOnly, doc, diagram.id]);

  // performer: actor của use case + Hệ thống
  const performers: Option[] = useMemo(() => {
    const ids = [...new Set([...spec.primaryActors, ...spec.secondaryActors])];
    return [
      ...ids.map((id) => ({ value: 'actor:' + id, label: actors.find((a) => a.id === id)?.name ?? '(actor đã xoá)' })),
      { value: 'system', label: 'Hệ thống' },
    ];
  }, [spec.primaryActors, spec.secondaryActors, actors]);
  const ucOptions: Option[] = useCases
    .filter((u) => u.id !== spec.useCaseId)
    .map((u) => ({ value: u.id, label: `${u.data.code ?? ''} ${u.name}`.trim() }));

  // ---------------- thanh trên ----------------
  const exportJson = async () => {
    const d = readDiagram(doc, diagram.id);
    if (!d) return;
    const path = await umlab.files.save({
      defaultName: `${slug(d.name)}.umlab.json`,
      filters: [{ name: 'Sơ đồ UMLab', extensions: ['json'] }],
      data: stringifyFile(toDiagramFile(d, [...modelMap(doc).values()])),
    });
    if (path) toast('Đã lưu ' + path.split(/[\\/]/).pop());
  };
  const importJson = async () => {
    const files = await umlab.files.open({ filters: [{ name: 'JSON', extensions: ['json'] }], asText: true });
    if (!files.length) return;
    try {
      const parsed = parseImport(files[0].text ?? '');
      if (parsed.kind !== 'diagram' || parsed.file.diagram.type !== 'usecase-spec')
        throw new ImportError('Tệp này không phải đặc tả use case.');
      if (spec.mainFlow.length || spec.description) {
        const ok = await confirmDialog({
          title: 'Thay thế đặc tả?',
          text: 'Nội dung hiện tại sẽ được thay bằng nội dung trong tệp.',
          confirmLabel: 'Thay thế',
        });
        if (!ok) return;
      }
      importIntoDiagram(doc, diagram.id, parsed.file, 'replace', LOCAL);
      toast('Đã nhập đặc tả');
    } catch (e) {
      if (e instanceof ImportError) toast([e.message, ...e.details].join(' · '), { error: true, ms: 8000 });
      else toast(e instanceof Error ? e.message : String(e), { error: true });
    }
  };
  useEffect(() => {
    setActions({
      exportJson: () => void exportJson(),
      importJson: readOnly ? undefined : () => void importJson(),
      check: () => setShowIssues((v) => !v),
      issues: issues.filter((i) => i.level !== 'info').length,
      extra: (
        <>
          <GenButton doc={doc} specId={diagram.id} g={ACTIVITY_GENERATOR} readOnly={readOnly} />
          <GenButton doc={doc} specId={diagram.id} g={SEQUENCE_GENERATOR} readOnly={readOnly} />
          <Button size="sm" variant="outline" icon={<Table2 />} onClick={() => openSpecReport(doc, diagram.id)}>
            Xuất mẫu Doc
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<FileDown />}
            onClick={() => void exportSpecsDocx(doc, [diagram.id])}
          >
            Xuất DOCX
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<FileText />}
            onClick={() => void exportSpecMarkdown(doc, diagram.id)}
          >
            Xuất Markdown
          </Button>
        </>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram.id, readOnly, issues.length, spec]);

  // mục đang xem (mục lục)
  useEffect(() => {
    const el = center.current;
    if (!el) return;
    const onScroll = () => {
      const secs = [...el.querySelectorAll('[data-section]')] as HTMLElement[];
      const top = el.getBoundingClientRect().top + 80;
      let cur = secs[0]?.dataset.section ?? 'general';
      for (const s of secs) if (s.getBoundingClientRect().top <= top) cur = s.dataset.section!;
      setActive(cur);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const go = (id: string) =>
    center.current?.querySelector('#sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ---------------- luồng ----------------
  const mainOps = {
    onEdit: (id: string, patch: Partial<Step>) => write((s) => updateStep(s, id, patch)),
    onInsert: (index: number) => {
      const st = newStep(nextPerformer(spec.mainFlow, index - 1, spec.primaryActors));
      write((s) => insertStep(s, index, st));
      setFocusId(st.id);
    },
    onRemove: (id: string, focusPrev: boolean) => {
      const i = spec.mainFlow.findIndex((s) => s.id === id);
      write((s) => removeStep(s, id));
      if (focusPrev && i > 0) setFocusId(spec.mainFlow[i - 1].id);
    },
    onMove: (from: number, to: number) => write((s) => moveStep(s, from, to)),
    onBranch: (no: number, kind: 'alternativeFlows' | 'exceptionFlows') => {
      let fid = '';
      write((s) => {
        const r = addFlow(s, kind, no);
        fid = r.flow.id;
        return r.spec;
      });
      requestAnimationFrame(() =>
        document.querySelector(`[data-flow="${fid}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
    },
  };
  const flowOps = (f: Flow) => ({
    onEdit: (id: string, patch: Partial<Step>) => write((s) => updateStep(s, id, patch)),
    onInsert: (index: number) => {
      const st = newStep(nextPerformer(f.steps, index - 1, spec.primaryActors));
      write((s) => editFlowSteps(s, f.id, (steps) => void steps.splice(index, 0, st)));
      setFocusId(st.id);
    },
    onRemove: (id: string, focusPrev: boolean) => {
      const i = f.steps.findIndex((s) => s.id === id);
      write((s) => editFlowSteps(s, f.id, (steps) => steps.filter((x) => x.id !== id)));
      if (focusPrev && i > 0) setFocusId(f.steps[i - 1].id);
    },
    onMove: (from: number, to: number) =>
      write((s) =>
        editFlowSteps(s, f.id, (steps) => {
          const [x] = steps.splice(from, 1);
          steps.splice(to, 0, x);
        }),
      ),
  });

  const stepOptions = spec.mainFlow.map((s) => ({ value: String(s.no), label: `Bước ${s.no}` }));
  const flowCards = (kind: 'alternativeFlows' | 'exceptionFlows') =>
    spec[kind].map((f) => {
      const invalidBranch = f.branchAt < 1 || f.branchAt > spec.mainFlow.length;
      const invalidReturn = f.end.kind === 'returnTo' && (f.end.stepNo < 1 || f.end.stepNo > spec.mainFlow.length);
      return (
        <div key={f.id} className="spec-flow" data-flow={f.id}>
          <div className="spec-flow-h">
            <span className="spec-code">{f.code}</span>
            <div className="min-w-0 flex-1">
              <Txt
                label={`Tên ${f.code}`}
                value={f.name}
                readOnly={readOnly}
                onCommit={(name) => write((s) => updateFlow(s, f.id, { name }))}
              />
            </div>
            {!readOnly && (
              <button
                className="ibtn sm"
                aria-label={`Xoá ${f.code}`}
                onClick={() => write((s) => removeFlow(s, f.id))}
              >
                <Trash2 />
              </button>
            )}
          </div>
          <div className="spec-flow-meta">
            <label className={cn('flex items-center gap-2', invalidBranch && 'text-[var(--danger)]')}>
              Rẽ từ bước
              <select
                className="field"
                style={{ width: 110, height: 28 }}
                value={String(f.branchAt)}
                disabled={readOnly}
                aria-label={`${f.code} rẽ từ bước`}
                onChange={(e) => write((s) => updateFlow(s, f.id, { branchAt: Number(e.target.value) }))}
              >
                {invalidBranch && <option value={String(f.branchAt)}>Bước {f.branchAt} (không tồn tại)</option>}
                {stepOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="min-w-0 flex-1">
              <Txt
                label={`Điều kiện ${f.code}`}
                placeholder="Điều kiện rẽ nhánh…"
                value={f.condition}
                readOnly={readOnly}
                onCommit={(condition) => write((s) => updateFlow(s, f.id, { condition }))}
              />
            </div>
          </div>
          <FlowTable
            label={`Các bước ${f.code}`}
            steps={f.steps}
            prefix={f.code + '.'}
            performers={performers}
            useCases={ucOptions}
            readOnly={readOnly}
            focusId={focusId}
            stepMenu={stepMenu}
            {...flowOps(f)}
          />
          <div className={cn('spec-flow-end', invalidReturn && 'text-[var(--danger)]')}>
            Kết thúc:
            <select
              className="field"
              style={{ width: 210, height: 28 }}
              disabled={readOnly}
              aria-label={`Kết thúc ${f.code}`}
              value={f.end.kind === 'returnTo' ? 'r' + f.end.stepNo : f.end.kind}
              onChange={(e) => {
                const v = e.target.value;
                const end: Flow['end'] = v.startsWith('r')
                  ? { kind: 'returnTo', stepNo: Number(v.slice(1)) }
                  : v === 'endSuccess'
                    ? { kind: 'endSuccess' }
                    : { kind: 'endFailure' };
                write((s) => updateFlow(s, f.id, { end }));
              }}
            >
              {invalidReturn && f.end.kind === 'returnTo' && (
                <option value={'r' + f.end.stepNo}>Quay lại bước {f.end.stepNo} (không tồn tại)</option>
              )}
              {spec.mainFlow.map((s) => (
                <option key={s.id} value={'r' + s.no}>
                  Quay lại bước {s.no}
                </option>
              ))}
              <option value="endSuccess">Kết thúc thành công</option>
              <option value="endFailure">Kết thúc thất bại</option>
            </select>
          </div>
        </div>
      );
    });

  // ---------------- chưa gắn use case ----------------
  const attach = (id: string) => {
    if (readOnly) return;
    doc.transact(() => {
      const m = modelMap(doc).get(id);
      if (m) modelMap(doc).set(id, { ...m, data: { ...m.data, specDiagramId: diagram.id } });
    }, LOCAL);
    setField('useCaseId', id);
  };
  const createUc = () => {
    if (readOnly) return;
    const n =
      Math.max(
        Number(metaMap(doc).get('ucCounter') ?? 0),
        ...useCases.map((u) => Number(/(\d+)/.exec(String(u.data.code))?.[1] ?? 0)),
        0,
      ) + 1;
    const m: ModelElement = {
      id: uid('m'),
      kind: 'uml.usecase',
      name: 'Use case mới',
      data: {
        code: 'UC' + String(n).padStart(2, '0'),
        description: '',
        rank: 'medium',
        status: 'proposed',
        isBusiness: false,
        extensionPoints: [],
        specDiagramId: diagram.id,
      },
    };
    doc.transact(() => {
      metaMap(doc).set('ucCounter', n);
      modelMap(doc).set(m.id, m);
    }, LOCAL);
    setField('useCaseId', m.id);
  };

  const setUc = (patch: Partial<ModelElement> & { data?: Record<string, unknown> }) => {
    if (readOnly || !uc) return;
    doc.transact(() => {
      const cur = modelMap(doc).get(uc.id);
      if (cur) modelMap(doc).set(uc.id, { ...cur, ...patch, data: { ...cur.data, ...(patch.data ?? {}) } });
    }, LOCAL);
  };

  const IssueIcon = ({ i }: { i: SpecIssue }) =>
    i.level === 'error' ? (
      <AlertCircle size={14} color="var(--danger)" />
    ) : i.level === 'warning' ? (
      <AlertTriangle size={14} color="var(--warn)" />
    ) : (
      <Info size={14} />
    );

  return (
    <div className="spec-grid">
      <nav className="spec-toc" aria-label="Mục lục">
        <div className="px-3 pt-3 pb-2 text-[10.5px] font-semibold tracking-wider text-muted uppercase">Mục lục</div>
        {SECTIONS.map(([id, label]) => {
          const n =
            id === 'mainFlow'
              ? spec.mainFlow.length
              : id === 'alternativeFlows'
                ? spec.alternativeFlows.length
                : id === 'exceptionFlows'
                  ? spec.exceptionFlows.length
                  : null;
          const bad = issues.some((i) => i.section === id && i.level !== 'info');
          return (
            <button key={id} className={cn('spec-toc-item', active === id && 'on')} onClick={() => go(id)}>
              <span className="flex-1 truncate">{label}</span>
              {bad && <AlertTriangle size={12} color="var(--warn)" />}
              {n !== null && <span className="text-muted tabular-nums">{n}</span>}
            </button>
          );
        })}
      </nav>
      <div ref={center} className="spec-main scroll" data-testid="spec">
        <div className="spec-page">
          <header className="spec-title">
            <div className="spec-title-code">{ctx.code || 'UC??'}</div>
            <h1>{ctx.name}</h1>
            <div className="text-muted">Phiên bản {spec.version}</div>
          </header>
          {!uc && (
            <div className="spec-banner">
              <b>Đặc tả chưa gắn với use case.</b> Chọn use case có sẵn trong project hoặc tạo mới:
              <div className="mt-2 flex flex-wrap gap-2">
                <div style={{ width: 260 }}>
                  <Select
                    value=""
                    disabled={readOnly}
                    aria-label="Chọn use case"
                    onChange={(e) => e.target.value && attach(e.target.value)}
                    options={[
                      { value: '', label: '(Chọn use case)' },
                      ...useCases.map((u) => ({ value: u.id, label: `${u.data.code ?? ''} ${u.name}`.trim() })),
                    ]}
                  />
                </div>
                <Button variant="outline" icon={<Plus />} disabled={readOnly} onClick={createUc}>
                  Tạo use case mới
                </Button>
              </div>
            </div>
          )}
          {showIssues && (
            <div className="spec-issues" role="region" aria-label="Kiểm tra">
              <div className="mb-1 flex items-center justify-between font-semibold">
                Kiểm tra · {issues.length} mục
                <button className="ibtn sm" aria-label="Đóng" onClick={() => setShowIssues(false)}>
                  <X />
                </button>
              </div>
              {issues.length ? (
                issues.map((i, k) => (
                  <button key={k} className="spec-issue" onClick={() => go(i.section)}>
                    <IssueIcon i={i} />
                    {i.message}
                  </button>
                ))
              ) : (
                <p className="text-muted">Không có cảnh báo.</p>
              )}
            </div>
          )}

          <Section id="general" title="Thông tin chung">
            <div className="spec-form">
              <label>Mô tả</label>
              <Txt
                label="Mô tả"
                rows={3}
                value={spec.description}
                readOnly={readOnly}
                placeholder="Mục đích của use case…"
                onCommit={(v) => setField('description', v)}
              />
              <label>Mức độ ưu tiên</label>
              <Segmented
                ariaLabel="Mức độ ưu tiên"
                value={spec.priority}
                onChange={(v) => setField('priority', v)}
                options={(['Cao', 'Trung bình', 'Thấp'] as const).map((v) => ({ value: v, label: v }))}
              />
              <label>Sự kiện kích hoạt</label>
              <Txt
                label="Sự kiện kích hoạt"
                value={spec.trigger}
                readOnly={readOnly}
                placeholder="VD: Sinh viên quét thẻ tại cổng"
                onCommit={(v) => setField('trigger', v)}
              />
              <label>Tần suất</label>
              <Txt
                label="Tần suất"
                value={spec.frequency ?? ''}
                readOnly={readOnly}
                placeholder="VD: ~2.000 lượt/ngày"
                onCommit={(v) => setField('frequency', v)}
              />
            </div>
          </Section>

          <Section id="actors" title="Tác nhân">
            <div className="spec-form">
              <label>Tác nhân chính</label>
              <ActorChips
                label="Tác nhân chính"
                ids={spec.primaryActors}
                actors={actors}
                readOnly={readOnly}
                onChange={(v) => setField('primaryActors', v)}
              />
              <label>Tác nhân phụ</label>
              <ActorChips
                label="Tác nhân phụ"
                ids={spec.secondaryActors}
                actors={actors}
                readOnly={readOnly}
                onChange={(v) => setField('secondaryActors', v)}
              />
              <label>Include</label>
              <div className="text-[12.5px]">
                {spec.includes.map(ctx.useCaseLabel).join(', ') || <span className="text-muted">—</span>}
              </div>
              <label>Extend</label>
              <div className="text-[12.5px]">
                {spec.extends.map(ctx.useCaseLabel).join(', ') || <span className="text-muted">—</span>}
              </div>
            </div>
            {derived &&
              !readOnly &&
              derived.primary.length + derived.secondary.length > 0 &&
              (derived.primary.join() !== spec.primaryActors.join() ||
                derived.secondary.join() !== spec.secondaryActors.join()) && (
                <p className="mt-2 text-[11.5px] text-muted">
                  Trên sơ đồ: chính {derived.primary.map(ctx.actorName).join(', ') || '—'} · phụ{' '}
                  {derived.secondary.map(ctx.actorName).join(', ') || '—'}.{' '}
                  <button
                    className="underline"
                    onClick={() =>
                      write((s) => ({ ...s, primaryActors: derived.primary, secondaryActors: derived.secondary }))
                    }
                  >
                    Lấy theo sơ đồ
                  </button>
                </p>
              )}
            <p className="mt-1 text-[11.5px] text-muted">Include / Extend lấy tự động từ Use Case Diagram (chỉ đọc).</p>
          </Section>

          <Section id="conditions" title="Điều kiện">
            <div className="spec-form">
              <label>Tiền điều kiện</label>
              <LinesEditor
                label="Tiền điều kiện"
                items={spec.preconditions}
                readOnly={readOnly}
                placeholder="Thêm tiền điều kiện, Enter để lưu"
                onChange={(v) => setField('preconditions', v)}
              />
              <label>Hậu điều kiện · thành công</label>
              <LinesEditor
                label="Hậu điều kiện thành công"
                items={spec.postconditions.success}
                readOnly={readOnly}
                placeholder="Khi thành công…"
                onChange={(v) => setField('postconditions', { ...spec.postconditions, success: v })}
              />
              <label>Hậu điều kiện · thất bại</label>
              <LinesEditor
                label="Hậu điều kiện thất bại"
                items={spec.postconditions.failure}
                readOnly={readOnly}
                placeholder="Khi thất bại…"
                onChange={(v) => setField('postconditions', { ...spec.postconditions, failure: v })}
              />
            </div>
          </Section>

          <Section
            id="mainFlow"
            title="Luồng sự kiện chính"
            right={
              !readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus />}
                  onClick={() => mainOps.onInsert(spec.mainFlow.length)}
                >
                  Thêm bước
                </Button>
              )
            }
          >
            <FlowTable
              label="Luồng sự kiện chính"
              steps={spec.mainFlow}
              performers={performers}
              useCases={ucOptions}
              readOnly={readOnly}
              focusId={focusId}
              stepMenu={stepMenu}
              {...mainOps}
            />
            <p className="mt-1.5 text-[11.5px] text-muted">
              Enter cuối dòng để thêm bước (người thực hiện tự xen kẽ), Shift+Enter xuống dòng, Backspace ở dòng rỗng để
              xoá. Kéo ⠿ để đổi thứ tự — luồng thay thế / ngoại lệ tự cập nhật số bước.
            </p>
          </Section>

          <Section
            id="alternativeFlows"
            title="Luồng thay thế"
            right={
              !readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus />}
                  onClick={() => mainOps.onBranch(Math.max(1, spec.mainFlow.length), 'alternativeFlows')}
                >
                  Thêm luồng
                </Button>
              )
            }
          >
            {spec.alternativeFlows.length ? (
              flowCards('alternativeFlows')
            ) : (
              <p className="text-muted">Chưa có luồng thay thế.</p>
            )}
          </Section>

          <Section
            id="exceptionFlows"
            title="Luồng ngoại lệ"
            right={
              !readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus />}
                  onClick={() => mainOps.onBranch(Math.max(1, spec.mainFlow.length), 'exceptionFlows')}
                >
                  Thêm luồng
                </Button>
              )
            }
          >
            {spec.exceptionFlows.length ? (
              flowCards('exceptionFlows')
            ) : (
              <p className="text-muted">Chưa có luồng ngoại lệ.</p>
            )}
          </Section>

          <Section id="rules" title="Quy tắc nghiệp vụ">
            <CodedEditor
              items={spec.businessRules}
              prefix="BR"
              readOnly={readOnly}
              placeholder="Thêm quy tắc, Enter để lưu"
              onChange={(v) => setField('businessRules', v)}
            />
          </Section>
          <Section id="nfr" title="Yêu cầu phi chức năng">
            <CodedEditor
              items={spec.nonFunctional}
              prefix="NFR"
              readOnly={readOnly}
              placeholder="Thêm yêu cầu, Enter để lưu"
              onChange={(v) => setField('nonFunctional', v)}
            />
          </Section>
          <Section id="data" title="Màn hình & dữ liệu liên quan">
            <div className="spec-form">
              <label>Màn hình</label>
              <LinesEditor
                label="Màn hình"
                items={spec.screens.map((x) => x.name)}
                readOnly={readOnly}
                placeholder="VD: Màn hình cổng vào"
                onChange={(v) =>
                  setField(
                    'screens',
                    v.map((name, i) => ({ id: spec.screens[i]?.id ?? uid('sc'), name })),
                  )
                }
              />
              <label>Dữ liệu</label>
              <div className="grid gap-1.5">
                {spec.entities.map((en, i) => (
                  <div key={en.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Txt
                        label={`Dữ liệu ${i + 1}`}
                        value={en.name}
                        readOnly={readOnly}
                        onCommit={(name) =>
                          setField(
                            'entities',
                            name.trim()
                              ? spec.entities.map((x) => (x.id === en.id ? { ...x, name } : x))
                              : spec.entities.filter((x) => x.id !== en.id),
                          )
                        }
                      />
                    </div>
                    <div style={{ width: 170 }}>
                      <Select
                        value={en.classId ?? ''}
                        disabled={readOnly || !classes.length}
                        aria-label="Lớp tương ứng"
                        onChange={(e) =>
                          setField(
                            'entities',
                            spec.entities.map((x) =>
                              x.id === en.id
                                ? e.target.value
                                  ? { ...x, classId: e.target.value }
                                  : { id: x.id, name: x.name }
                                : x,
                            ),
                          )
                        }
                        options={[
                          { value: '', label: classes.length ? '(Không gắn lớp)' : '(Chưa có class)' },
                          ...classes.map((c) => ({ value: c.id, label: c.name })),
                        ]}
                      />
                    </div>
                    {!readOnly && (
                      <button
                        className="ibtn sm"
                        aria-label="Xoá dữ liệu"
                        onClick={() =>
                          setField(
                            'entities',
                            spec.entities.filter((x) => x.id !== en.id),
                          )
                        }
                      >
                        <X />
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <AddLine
                    placeholder="VD: PhienGuiXe — chọn từ class hoặc gõ tên"
                    classes={classes}
                    onAdd={(name, classId) =>
                      setField('entities', [
                        ...spec.entities,
                        classId ? { id: uid('en'), name, classId } : { id: uid('en'), name },
                      ])
                    }
                  />
                )}
              </div>
              <label>Ghi chú & ảnh màn hình</label>
              <ImageAttachments
                label="Ảnh màn hình / phác thảo"
                value={spec.images ?? []}
                readOnly={readOnly}
                onChange={(v) => setField('images', v)}
              >
                <Txt
                  label="Ghi chú"
                  rows={2}
                  value={spec.notes ?? ''}
                  readOnly={readOnly}
                  onCommit={(v) => setField('notes', v)}
                />
              </ImageAttachments>
            </div>
          </Section>
        </div>
      </div>
      <aside className="spec-side" aria-label="Use case gốc">
        <div className="scroll">
          <div className="pgroup">
            <div className="pgroup-h">Use case gốc</div>
            {uc ? (
              <>
                <div className="row2">
                  <div>
                    <span className="lbl">Mã</span>
                    <Txt
                      label="Mã use case"
                      value={String(uc.data.code ?? '')}
                      readOnly={readOnly}
                      onCommit={(code) => setUc({ data: { code } })}
                    />
                  </div>
                  <div>
                    <span className="lbl">Trạng thái</span>
                    <Select
                      value={String(uc.data.status ?? 'proposed')}
                      disabled={readOnly}
                      aria-label="Trạng thái use case"
                      onChange={(e) => setUc({ data: { status: e.target.value } })}
                      options={[
                        { value: 'proposed', label: 'Đề xuất' },
                        { value: 'approved', label: 'Đã duyệt' },
                        { value: 'done', label: 'Hoàn thành' },
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <span className="lbl">Tên</span>
                  <Txt
                    label="Tên use case"
                    value={uc.name}
                    readOnly={readOnly}
                    onCommit={(name) => name.trim() && setUc({ name: name.trim() })}
                  />
                </div>
                <p className="text-[11.5px] text-muted">
                  Đổi mã / tên ở đây sẽ cập nhật trên mọi Use Case Diagram và ngược lại.
                </p>
              </>
            ) : (
              <p className="text-muted">Chưa gắn use case.</p>
            )}
          </div>
          <div className="pgroup">
            <div className="pgroup-h">Kiểm tra</div>
            {issues.length ? (
              issues.map((i, k) => (
                <button key={k} className="spec-issue" onClick={() => go(i.section)}>
                  <IssueIcon i={i} />
                  {i.message}
                </button>
              ))
            ) : (
              <p className="text-[11.5px] text-muted">Không có cảnh báo.</p>
            )}
          </div>
          <div className="pgroup">
            <p className="text-[11.5px] text-muted" style={{ lineHeight: 1.55 }}>
              {spec.mainFlow.length} bước chính · {spec.alternativeFlows.length} luồng thay thế ·{' '}
              {spec.exceptionFlows.length} ngoại lệ. Phiên bản {spec.version} tăng mỗi lần nội dung đổi.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function AddLine({
  placeholder,
  classes,
  onAdd,
}: {
  placeholder: string;
  classes: ModelElement[];
  onAdd: (name: string, classId?: string) => void;
}) {
  const [v, setV] = useState('');
  const add = () => {
    const name = v.trim();
    if (!name) return;
    const cls = classes.find((c) => c.name.toLowerCase() === name.toLowerCase());
    onAdd(cls ? cls.name : name, cls?.id);
    setV('');
  };
  return (
    <>
      <input
        className="field"
        list="spec-classes"
        placeholder={placeholder}
        value={v}
        aria-label="Thêm dữ liệu"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        onBlur={add}
      />
      <datalist id="spec-classes">
        {classes.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
    </>
  );
}

registerEditor('usecase-spec', (p) => <SpecEditor {...p} />);

registerDiagramTemplates('usecase-spec', [
  {
    id: 'blank',
    label: 'Đặc tả trống',
    description: 'Chọn use case sau khi tạo',
    build: () => ({ data: { useCaseId: '' } }),
  },
]);

// ảnh thu nhỏ: trang tài liệu có mã + tên + vài dòng bước
registerThumbnail('usecase-spec', (doc, d) => {
  const spec = readSpec(doc, d.id);
  const ctx = specContext(doc, spec);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lines = spec.mainFlow.slice(0, 6);
  const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#F6F7F9"/>` +
    `<rect x="40" y="10" width="240" height="190" rx="4" fill="#FFFFFF" stroke="#E2E5EA"/>` +
    `<text x="56" y="36" font-family="Roboto, Arial" font-size="13" font-weight="700" fill="#2E62E6">${esc(ctx.code || 'UC')}</text>` +
    `<text x="56" y="54" font-family="Roboto, Arial" font-size="12" font-weight="600" fill="#1B2130">${esc(cut(ctx.name, 34))}</text>` +
    lines
      .map(
        (s, i) =>
          `<rect x="56" y="${68 + i * 20}" width="208" height="16" fill="${i % 2 ? '#FFFFFF' : '#F4F6FA'}"/><text x="60" y="${80 + i * 20}" font-family="Roboto, Arial" font-size="9.5" fill="#475569">${s.no}. ${esc(cut(s.text, 44))}</text>`,
      )
      .join('') +
    (spec.mainFlow.length
      ? ''
      : `<text x="56" y="84" font-family="Roboto, Arial" font-size="10" fill="#94A3B8">Chưa có bước</text>`) +
    `</svg>`
  );
});
