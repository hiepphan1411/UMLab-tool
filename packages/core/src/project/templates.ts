import { migrateLegacyUnipark } from '../format/legacy';
import type { DiagramRecord, DiagramType, Folder, ProjectBundle } from '../format/types';
import { normGantt } from '../gantt/model';
import { uid } from '../util/ids';
import { emptyBundle } from './bundle';

export type ProjectTemplate = 'blank' | 'unipark-sample';

/** Sơ đồ rỗng đúng cấu trúc theo loại. */
export function newDiagram(
  type: DiagramType,
  name: string,
  folderId: string | null,
  order = 0,
  now = new Date().toISOString(),
): DiagramRecord {
  return {
    id: uid('dg'),
    type,
    name,
    folderId,
    order,
    createdAt: now,
    updatedAt: now,
    generatedFrom: null,
    canvas: { background: '#FFFFFF', grid: type !== 'gantt' && type !== 'usecase-spec' },
    views: [],
    connectors: [],
    data: type === 'gantt' ? normGantt({ title: name }, 'sprint') : null,
  };
}

/**
 * Mẫu project. `unipark-sample`: thư mục mẫu + sơ đồ kiến trúc và 2 Gantt từ fixture UniPark+ (tool cũ).
 * `legacyFixture` là nội dung docs/reference/unipark-plus.json (truyền vào để core không đọc tệp).
 */
export function buildTemplate(template: ProjectTemplate, name: string, legacyFixture?: unknown): ProjectBundle {
  const b = emptyBundle(name);
  if (template === 'blank' || !legacyFixture) return b;
  const legacy = migrateLegacyUnipark(legacyFixture);
  const mk = (n: string, order: number, parentId: string | null = null): Folder => ({
    id: uid('f'),
    parentId,
    name: n,
    order,
  });
  const fAnalysis = mk('Phân tích', 0);
  const fDesign = mk('Thiết kế', 1);
  const fPlan = mk('Quản lý dự án', 2);
  b.folders = [fAnalysis, fDesign, fPlan];
  b.diagrams = legacy.diagrams.map((d, i) => ({
    ...d,
    folderId: d.type === 'gantt' ? fPlan.id : fDesign.id,
    order: i,
  }));
  b.project.description = 'Dự án mẫu UniPark+ — bãi giữ xe thông minh';
  b.project.icon = 'car';
  return b;
}
