import {
  ImportError,
  conflictingModel,
  createDiagram,
  deleteDiagrams,
  deleteFolder,
  diagramTypeLabel,
  diagramUsesFolder,
  diagramsMap,
  foldersMap,
  importDiagramFile,
  modelMap,
  parseImport,
  readDiagram,
  stringifyFile,
  toDiagramFile,
  toProjectFile,
  type DiagramRecord,
  type DiagramType,
} from '@umlab/core';
import { umlab } from '@/lib/api';
import { slug } from '@/lib/format';
import { choiceDialog, confirmDialog, toast } from '@/ui';
import { LOCAL, type ProjectSession } from './session';

/** Xuất một sơ đồ ra `<ten-so-do>.umlab.json` (kèm phần tử mô hình được tham chiếu). */
export async function exportDiagram(s: ProjectSession, id: string): Promise<void> {
  const d = readDiagram(s.doc, id);
  if (!d) return;
  const path = await umlab.files.save({
    defaultName: `${slug(d.name)}.umlab.json`,
    filters: [{ name: 'Sơ đồ UMLab', extensions: ['json'] }],
    data: stringifyFile(toDiagramFile(d, [...modelMap(s.doc).values()])),
  });
  if (path) toast('Đã lưu ' + path.split(/[\\/]/).pop());
}

/** Xuất nhiều sơ đồ gộp vào một tệp `kind: project` (chỉ gồm các sơ đồ đã chọn và thư mục chứa chúng). */
export async function exportDiagrams(s: ProjectSession, ids: string[]): Promise<void> {
  if (ids.length === 1) return exportDiagram(s, ids[0]);
  const diagrams = ids.map((id) => readDiagram(s.doc, id)).filter((d): d is DiagramRecord => !!d);
  const folderIds = new Set(diagrams.map((d) => d.folderId).filter(Boolean) as string[]);
  // thêm thư mục cha để giữ cấu trúc
  for (const fid of [...folderIds]) {
    let f = foldersMap(s.doc).get(fid);
    while (f?.parentId) {
      folderIds.add(f.parentId);
      f = foldersMap(s.doc).get(f.parentId);
    }
  }
  const p = s.getSnapshot().project;
  const file = toProjectFile({
    project: { id: p.id, name: p.name, description: p.description, color: p.color, icon: p.icon },
    folders: [...folderIds].map((id) => foldersMap(s.doc).get(id)!).filter(Boolean),
    diagrams,
    model: [...modelMap(s.doc).values()],
  });
  const path = await umlab.files.save({
    defaultName: `${slug(p.name)}-${diagrams.length}-so-do.umlab-project.json`,
    filters: [{ name: 'UMLab', extensions: ['json'] }],
    data: stringifyFile(file),
  });
  if (path) toast(`Đã xuất ${diagrams.length} sơ đồ`);
}

/**
 * Nhập JSON vào project đang mở (thư mục đang chọn): tệp một sơ đồ, tệp project (gộp các sơ đồ trong đó),
 * hoặc tệp UniPark+ Diagram Studio cũ. Trả về id sơ đồ đầu tiên đã tạo.
 */
export async function importIntoProject(
  s: ProjectSession,
  folderId: string | null,
  text?: string,
): Promise<string | null> {
  let content = text;
  if (content === undefined) {
    const files = await umlab.files.open({ filters: [{ name: 'JSON', extensions: ['json'] }], asText: true });
    if (!files.length) return null;
    content = files[0].text ?? '';
  }
  try {
    const parsed = parseImport(content);
    if (parsed.kind === 'diagram') {
      const conflicts = conflictingModel(s.doc, parsed.file);
      let mode: 'reuse' | 'copy' = 'reuse';
      if (conflicts.length) {
        const pick = await choiceDialog({
          title: 'Phần tử mô hình đã có trong project',
          text: `${conflicts.length} phần tử (${conflicts
            .slice(0, 3)
            .map((m) => m.name)
            .join(
              ', ',
            )}${conflicts.length > 3 ? '…' : ''}) đã tồn tại. Dùng lại phần tử sẵn có (đổi tên ở đâu cũng cập nhật mọi sơ đồ) hay tạo bản sao riêng?`,
          options: [
            { value: 'copy', label: 'Tạo bản sao' },
            { value: 'reuse', label: 'Dùng lại', variant: 'primary' },
          ],
        });
        if (!pick) return null;
        mode = pick;
      }
      const id = importDiagramFile(s.doc, parsed.file, folderId, mode, LOCAL);
      toast(`Đã nhập ${diagramTypeLabel(parsed.file.diagram.type)} “${parsed.file.diagram.name}”`);
      return id;
    }
    const b = parsed.bundle;
    let first: string | null = null;
    for (const d of b.diagrams) {
      const id = createDiagram(s.doc, d.type, d.name, folderId, LOCAL, {
        views: d.views,
        connectors: d.connectors,
        data: d.data,
        canvas: d.canvas,
        model: d === b.diagrams[0] ? b.model.filter((m) => !modelMap(s.doc).has(m.id)) : [],
      });
      first ??= id;
    }
    toast(`Đã nhập ${b.diagrams.length} sơ đồ`);
    return first;
  } catch (e) {
    if (e instanceof ImportError) toast([e.message, ...e.details].join(' · '), { error: true, ms: 9000 });
    else toast('Không nhập được: ' + (e instanceof Error ? e.message : String(e)), { error: true });
    return null;
  }
}

export async function confirmDeleteDiagrams(s: ProjectSession, ids: string[]): Promise<boolean> {
  const names = ids.map((id) => diagramsMap(s.doc).get(id)?.name).filter(Boolean);
  const ok = await confirmDialog({
    title: ids.length > 1 ? `Xoá ${ids.length} sơ đồ?` : 'Xoá sơ đồ?',
    text:
      ids.length > 1 ? (
        `Các sơ đồ ${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''} sẽ bị xoá với mọi thành viên. Phần tử mô hình vẫn được giữ trong project.`
      ) : (
        <>
          Sơ đồ <b>{names[0]}</b> sẽ bị xoá với mọi thành viên. Phần tử mô hình (class, actor…) vẫn được giữ trong
          project.
        </>
      ),
    confirmLabel: 'Xoá',
    danger: true,
  });
  if (ok) deleteDiagrams(s.doc, ids, LOCAL);
  return ok;
}

export async function confirmDeleteFolder(s: ProjectSession, id: string): Promise<boolean> {
  const f = foldersMap(s.doc).get(id);
  if (!f) return false;
  const use = diagramUsesFolder(s.doc, id);
  if (!use.diagrams && !use.folders) {
    const ok = await confirmDialog({
      title: 'Xoá thư mục?',
      text: (
        <>
          Thư mục rỗng <b>{f.name}</b> sẽ bị xoá.
        </>
      ),
      confirmLabel: 'Xoá',
      danger: true,
    });
    if (ok) deleteFolder(s.doc, id, 'cascade', LOCAL);
    return ok;
  }
  const mode = await choiceDialog({
    title: `Xoá thư mục “${f.name}”?`,
    text: `Thư mục có ${use.diagrams} sơ đồ${use.folders ? ` và ${use.folders} thư mục con` : ''}. Bạn muốn xoá cả nội dung hay chuyển nội dung lên thư mục cha?`,
    options: [
      { value: 'moveToParent', label: 'Chuyển lên thư mục cha', variant: 'primary' },
      { value: 'cascade', label: 'Xoá cả nội dung', variant: 'danger' },
    ],
  });
  if (!mode) return false;
  deleteFolder(s.doc, id, mode, LOCAL);
  return true;
}

export const defaultDiagramName = (type: DiagramType) => diagramTypeLabel(type);
