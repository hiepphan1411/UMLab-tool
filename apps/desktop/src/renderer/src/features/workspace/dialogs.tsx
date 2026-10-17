import { useEffect, useMemo, useState } from 'react';
import {
  DIAGRAM_TYPE_BY_ID,
  childFolders,
  createDiagram,
  folderDiagrams,
  uniqueName,
  type DiagramType,
} from '@umlab/core';
import { DiagramIcon } from '@/lib/icons';
import { Button, Dialog, Field, Input, Select } from '@/ui';
import { LOCAL, type ProjectSession } from './session';

/** Danh sách thư mục dạng thụt lề cho ô chọn. */
export function useFolderOptions(s: ProjectSession, version: number) {
  return useMemo(() => {
    const out: { value: string; label: string }[] = [{ value: '', label: '(Gốc project)' }];
    const walk = (parent: string | null, depth: number) => {
      for (const f of childFolders(s.doc, parent)) {
        out.push({ value: f.id, label: `${' '.repeat(depth)}${f.name}` });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 1);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, version]);
}

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
  const options = useFolderOptions(session, version);
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
  }, [type, folderId, session]);
  if (!type) return null;
  const info = DIAGRAM_TYPE_BY_ID[type] ?? { label: 'Playground' };
  const submit = () => {
    const id = createDiagram(session.doc, type, name || info.label, folder || null, LOCAL);
    onCreated(id);
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
      width={460}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={submit}>
            Tạo & mở
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Tên sơ đồ">
          <Input
            id="diagram-name"
            size2="lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-autofocus
            onFocus={(e) => e.currentTarget.select()}
          />
        </Field>
        <Field label="Thư mục">
          <Select value={folder} onChange={(e) => setFolder(e.target.value)} options={options} />
        </Field>
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
  const options = useFolderOptions(session, version);
  const [folder, setFolder] = useState('');
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Chuyển ${count} sơ đồ tới thư mục`}
      width={420}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={() => onMove(folder || null)}>
            Chuyển
          </Button>
        </>
      }
    >
      <Select value={folder} onChange={(e) => setFolder(e.target.value)} options={options} />
    </Dialog>
  );
}
