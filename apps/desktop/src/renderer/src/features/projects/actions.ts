import {
  ImportError,
  buildTemplate,
  bundleToUpdate,
  computeStats,
  docFromUpdates,
  parseImport,
  readBundle,
  regenerateIds,
  stringifyFile,
  toProjectFile,
  type ProjectBundle,
  type ProjectTemplate,
} from '@umlab/core';
import legacyFixture from '@fixtures/unipark-plus.json';
import type { ProjectSummary } from '@shared/api';
import { call, umlab } from '@/lib/api';
import { slug } from '@/lib/format';

export interface ProjectForm {
  name: string;
  description: string;
  color: string;
  icon: string;
  template: ProjectTemplate;
}

/** Tạo project từ một bundle (mẫu, nhập tệp, nhân bản): sinh lại id, gửi kèm dữ liệu ban đầu, cập nhật thống kê. */
export async function createFromBundle(
  bundle: ProjectBundle,
  info: { name: string; description?: string; color?: string; icon?: string },
): Promise<ProjectSummary> {
  const b = regenerateIds(bundle);
  const update = bundleToUpdate(b);
  const p = await call(
    umlab.projects.create({
      name: info.name,
      description: info.description ?? b.project.description,
      color: info.color ?? b.project.color,
      icon: info.icon ?? b.project.icon,
      initialUpdate: update,
    }),
  );
  await umlab.projects.setStats(p.id, computeStats(docFromUpdates([update])));
  return p;
}

export function createProject(f: ProjectForm): Promise<ProjectSummary> {
  const bundle = buildTemplate(f.template, f.name, legacyFixture);
  return createFromBundle(bundle, f);
}

export async function loadBundle(
  p: Pick<ProjectSummary, 'id' | 'name' | 'description' | 'color' | 'icon'>,
): Promise<ProjectBundle> {
  const updates = await call(umlab.projects.loadUpdates(p.id));
  return readBundle(docFromUpdates(updates), {
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    icon: p.icon,
  });
}

export async function duplicateProject(p: ProjectSummary): Promise<ProjectSummary> {
  const b = await loadBundle(p);
  return createFromBundle(b, { name: `${p.name} (bản sao)`, description: p.description, color: p.color, icon: p.icon });
}

/** Xuất JSON `kind: project` ra tệp `<ten-project>.umlab-project.json`. Trả về đường dẫn hoặc null nếu huỷ. */
export async function exportProject(p: ProjectSummary): Promise<string | null> {
  const b = await loadBundle(p);
  return umlab.files.save({
    defaultName: `${slug(p.name)}.umlab-project.json`,
    filters: [{ name: 'UMLab project', extensions: ['json'] }],
    data: stringifyFile(toProjectFile(b)),
  });
}

/** Chọn tệp JSON (project UMLab hoặc UniPark+ Diagram Studio cũ) và tạo project mới. null nếu huỷ chọn. */
export async function importProjectFromFile(): Promise<ProjectSummary | null> {
  const files = await umlab.files.open({ filters: [{ name: 'JSON', extensions: ['json'] }], asText: true });
  if (!files.length) return null;
  return importProjectText(files[0].text ?? '', files[0].name);
}

export async function importProjectText(text: string, fileName = 'tệp'): Promise<ProjectSummary> {
  const parsed = parseImport(text);
  if (parsed.kind === 'diagram')
    throw new ImportError(
      `${fileName} là tệp một sơ đồ. Hãy mở một project rồi dùng “Nhập JSON” trong project để thêm sơ đồ.`,
    );
  const b = parsed.bundle;
  return createFromBundle(b, {
    name: b.project.name || 'Project nhập',
    description: b.project.description,
    color: b.project.color,
    icon: b.project.icon,
  });
}
