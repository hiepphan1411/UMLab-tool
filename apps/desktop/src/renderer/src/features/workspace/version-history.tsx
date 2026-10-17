// Lịch sử phiên bản sơ đồ (docs/phases/P13-polish-deploy.md mục 3): tự lưu snapshot khi sơ đồ thay đổi, cách nhau
// ≥ 5 phút (giữ 50 bản — main process cắt bớt), lưu tay có nhãn, xem trước, khôi phục (một giao dịch — Undo được).
import { History, RotateCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import {
  createDiagram,
  importIntoDiagram,
  modelMap,
  parseImport,
  readDiagram,
  stringifyFile,
  toDiagramFile,
  type DiagramFile,
} from '@umlab/core';
import type { DiagramVersionInfo } from '@shared/api';
import { call, errorText, umlab } from '@/lib/api';
import { bytes, timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button, Dialog, confirmDialog, promptDialog, toast } from '@/ui';
import { renderThumbnail } from '../editors/thumbnails';
import { LOCAL, useYVersion, type ProjectSession } from './session';

/** Khoảng cách tối thiểu giữa 2 snapshot tự động. */
export const SNAPSHOT_EVERY_MS = 5 * 60 * 1000;
const IDLE_MS = 8000;

/** JSON sơ đồ (kèm phần tử mô hình được nhắc tới) để lưu phiên bản. */
export function snapshotOf(session: ProjectSession, diagramId: string): string | null {
  const d = readDiagram(session.doc, diagramId);
  if (!d) return null;
  const text = JSON.stringify(d);
  const model = [...modelMap(session.doc).values()].filter((m) => text.includes(m.id));
  return stringifyFile(toDiagramFile(d, model));
}

async function saveVersion(
  session: ProjectSession,
  diagramId: string,
  label: string,
): Promise<DiagramVersionInfo | null> {
  const content = snapshotOf(session, diagramId);
  if (!content || !umlab) return null;
  return call(umlab.versions.save(session.projectId, diagramId, label, content));
}

/** Tự lưu phiên bản: sau khi sơ đồ đổi và ngừng sửa vài giây, nếu bản gần nhất đã cũ hơn 5 phút. */
export function useAutoSnapshot(session: ProjectSession, diagramId: string, enabled: boolean) {
  const ver = useYVersion(session.doc, [`views:${diagramId}`, `conns:${diagramId}`, `data:${diagramId}`]);
  const last = useRef<number | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (!enabled || !umlab) return;
    void call(umlab.versions.list(session.projectId, diagramId))
      .then((l) => (last.current = l[0] ? Date.parse(l[0].createdAt) : 0))
      .catch(() => (last.current = 0));
  }, [session, diagramId, enabled]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled) return;
    const t = setTimeout(() => {
      if (last.current === null || Date.now() - last.current < SNAPSHOT_EVERY_MS) return;
      last.current = Date.now();
      void saveVersion(session, diagramId, 'Tự động').catch(() => (last.current = 0)); // offline: thử lại lần sau
    }, IDLE_MS);
    return () => clearTimeout(t);
  }, [ver, enabled, session, diagramId]);
}

function Preview({ content }: { content: string }) {
  const svg = useMemo(() => {
    try {
      const parsed = parseImport(content);
      if (parsed.kind !== 'diagram') return null;
      const f: DiagramFile = parsed.file;
      const doc = new Y.Doc();
      const id = createDiagram(doc, f.diagram.type, f.diagram.name, null, undefined, {
        views: f.diagram.views,
        connectors: f.diagram.connectors,
        data: f.diagram.data,
        canvas: f.diagram.canvas,
        model: f.model,
      });
      const meta = readDiagram(doc, id);
      return meta ? renderThumbnail(doc, { ...meta, updatedAt: String(Math.random()) }) : null;
    } catch {
      return null;
    }
  }, [content]);
  return svg ? (
    <div
      className="grid h-[220px] place-items-center rounded-lg border border-line bg-white p-2 [&>svg]:max-h-full [&>svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  ) : (
    <div className="grid h-[220px] place-items-center rounded-lg border border-line text-muted">
      Không xem trước được
    </div>
  );
}

export function VersionHistoryDialog({
  session,
  diagramId,
  readOnly,
  onClose,
}: {
  session: ProjectSession;
  diagramId: string;
  readOnly: boolean;
  onClose: () => void;
}) {
  const [list, setList] = useState<DiagramVersionInfo[] | null>(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const load = () =>
    call(umlab.versions.list(session.projectId, diagramId))
      .then((l) => {
        setList(l);
        setSel((s) => s ?? l[0]?.id ?? null);
      })
      .catch((e) => setError(errorText(e)));
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setContent(null);
    if (!sel) return;
    let alive = true;
    void call(umlab.versions.get(sel))
      .then((c) => alive && setContent(c))
      .catch((e) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [sel]);

  const restore = async () => {
    const v = list?.find((x) => x.id === sel);
    if (!v || !content) return;
    const ok = await confirmDialog({
      title: 'Khôi phục phiên bản?',
      text: `Nội dung sơ đồ sẽ được thay bằng phiên bản lúc ${new Date(v.createdAt).toLocaleString('vi-VN')}. Bản hiện tại được lưu thành một phiên bản trước khi khôi phục; có thể Hoàn tác (Ctrl+Z).`,
      confirmLabel: 'Khôi phục',
    });
    if (!ok) return;
    try {
      await saveVersion(session, diagramId, 'Trước khi khôi phục').catch(() => null);
      const parsed = parseImport(content);
      if (parsed.kind !== 'diagram') throw new Error('Phiên bản hỏng.');
      importIntoDiagram(session.doc, diagramId, parsed.file, 'replace', LOCAL);
      toast('Đã khôi phục phiên bản');
      onClose();
    } catch (e) {
      toast(errorText(e), { error: true });
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Lịch sử phiên bản"
      width={760}
      footer={
        <>
          {!readOnly && (
            <Button
              variant="outline"
              icon={<Save />}
              onClick={async () => {
                const label = await promptDialog({ title: 'Lưu phiên bản', label: 'Nhãn (tuỳ chọn)', initial: '' });
                if (label === null) return;
                try {
                  await saveVersion(session, diagramId, label || 'Lưu tay');
                  toast('Đã lưu phiên bản');
                  setSel(null);
                  void load();
                } catch (e) {
                  toast(errorText(e), { error: true });
                }
              }}
            >
              Lưu phiên bản
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          {!readOnly && (
            <Button variant="primary" icon={<RotateCcw />} disabled={!content} onClick={() => void restore()}>
              Khôi phục
            </Button>
          )}
        </>
      }
    >
      {error && <p className="mb-2 text-[var(--danger)]">{error}</p>}
      <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-3">
        <div
          className="grid max-h-[300px] content-start gap-0.5 overflow-auto"
          role="listbox"
          aria-label="Các phiên bản"
        >
          {list === null && !error && <p className="text-muted">Đang tải…</p>}
          {list?.length === 0 && (
            <p className="text-muted">
              Chưa có phiên bản nào. Phiên bản được lưu tự động khi sơ đồ thay đổi (cách nhau ít nhất 5 phút) hoặc bấm
              “Lưu phiên bản”.
            </p>
          )}
          {list?.map((v) => (
            <button
              key={v.id}
              type="button"
              role="option"
              aria-selected={sel === v.id}
              className={cn(
                'tree-row h-auto! w-full flex-col items-start! gap-0! px-2 py-1.5 text-left',
                sel === v.id && 'on',
              )}
              onClick={() => setSel(v.id)}
            >
              <span className="font-medium">
                {new Date(v.createdAt).toLocaleString('vi-VN')} · {v.label}
              </span>
              <span className="text-[11.5px] text-muted">
                {v.userName} · {timeAgo(v.createdAt)} · {bytes(v.size)}
              </span>
            </button>
          ))}
        </div>
        <div>
          {content ? <Preview content={content} /> : <div className="h-[220px] rounded-lg border border-line" />}
        </div>
      </div>
    </Dialog>
  );
}

export const HistoryIcon = History;
