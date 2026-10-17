import { useEffect, useState } from 'react';
import { DIAGRAM_TYPE_BY_ID, createDiagram, folderDiagrams, uniqueName, type DiagramType } from '@umlab/core';
import { DiagramIcon } from '@/lib/icons';
import { cn } from '@/lib/cn';
import { Button, Dialog, Input, toast } from '@/ui';
import { getDiagramTemplates } from '../editors/editor-registry';
import { useEditorReady } from '../editors/register-all';
import { FolderBrowser } from './folder-browser';
import { LOCAL, type ProjectSession } from './session';

/** Tạo sơ đồ mới: hỏi tên + thư mục (mặc định thư mục đang chọn). */
export function NewDiagramDialog({
  session,
  type,
  folderId,
  version,
  onClose,
  onCreated,
}: {
  session: ProjectSession;
  type: DiagramType | null;
  folderId: string | null;
  version: number;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [folder, setFolder] = useState<string>(folderId ?? '');
  const [tpl, setTpl] = useState('');
  const [busy, setBusy] = useState(false);
  const tplReady = useEditorReady(type);
  const tpls = type && tplReady ? getDiagramTemplates(type) : [];
  useEffect(() => {
    if (!type) return;
    const base = DIAGRAM_TYPE_BY_ID[type]?.label ?? 'Playground';
    setName(
      uniqueName(
        folderDiagrams(session.doc, folderId).map((d) => d.name),
        base,
      ),
    );
    setFolder(folderId ?? '');
    setTpl(getDiagramTemplates(type)[0]?.id ?? '');
  }, [type, folderId, session, tplReady]);
  if (!type) return null;
  const info = DIAGRAM_TYPE_BY_ID[type] ?? { label: 'Playground' };
  const submit = async () => {
    if (busy) return;
    const t = tpls.find((x) => x.id === tpl);
    setBusy(true);
    try {
      const init = t ? await t.build({ doc: session.doc, name: name || info.label }) : undefined;
      const id = createDiagram(session.doc, type, name || info.label, folder || null, LOCAL, init);
      onCreated(id);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <DiagramIcon type={type} colored />
          {info.label} mới
        </span>
      }
      width={tpls.length > 1 ? 860 : 680}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            Tạo & mở
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className={cn('grid gap-4', tpls.length > 1 && 'md:grid-cols-[1fr_250px]')}>
          <div className="grid min-w-0 gap-3">
            <FolderBrowser
              session={session}
              version={version}
              value={folder || null}
              onChange={(f) => setFolder(f ?? '')}
            />
            <div className="fb-name">
              <label htmlFor="diagram-name" className="lbl" style={{ margin: 0 }}>
                Tên sơ đồ
              </label>
              <Input
                id="diagram-name"
                size2="lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-autofocus
                onFocus={(e) => e.currentTarget.select()}
              />
              <span className="lbl" style={{ margin: 0 }}>
                Loại
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px]">
                <DiagramIcon type={type} size={15} colored />
                {info.label}
              </span>
            </div>
          </div>
          {tpls.length > 1 && (
            <div>
              <span className="lbl">Mẫu</span>
              <div className="grid gap-2" role="radiogroup" aria-label="Mẫu sơ đồ">
                {tpls.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={tpl === t.id}
                    data-template={t.id}
                    className={cn('tpl-card', tpl === t.id && 'on')}
                    onClick={() => setTpl(t.id)}
                  >
                    <span className="font-semibold">{t.label}</span>
                    {t.description && <span className="text-[11.5px] text-muted">{t.description}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

export function MoveDialog({
  session,
  count,
  version,
  onClose,
  onMove,
}: {
  session: ProjectSession;
  count: number;
  version: number;
  onClose: () => void;
  onMove: (folderId: string | null) => void;
}) {
  const [folder, setFolder] = useState<string | null>(null);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Chuyển ${count} sơ đồ tới thư mục`}
      width={680}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={() => onMove(folder)}>
            Chuyển
          </Button>
        </>
      }
    >
      <FolderBrowser session={session} version={version} value={folder} onChange={setFolder} />
    </Dialog>
  );
}
