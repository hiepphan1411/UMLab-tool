import type { DiagramType } from './format/types';

export interface DiagramTypeInfo {
  type: DiagramType;
  label: string;
  short: string;
  description: string;
  /** Tên icon lucide (dashboard, cây thư mục). */
  icon: string;
  canvas: boolean;
}

/** Thứ tự hiển thị 8 loại sơ đồ (thẻ "Tạo sơ đồ mới", nhóm "Theo loại"). */
export const DIAGRAM_TYPE_INFO: DiagramTypeInfo[] = [
  {
    type: 'usecase',
    label: 'Use Case Diagram',
    short: 'Use Case',
    description: 'Tác nhân, use case, include/extend',
    icon: 'users-round',
    canvas: true,
  },
  {
    type: 'usecase-spec',
    label: 'Đặc tả Use Case',
    short: 'Đặc tả UC',
    description: 'Luồng sự kiện, điều kiện, xuất DOCX',
    icon: 'file-text',
    canvas: false,
  },
  {
    type: 'activity',
    label: 'Activity Diagram',
    short: 'Activity',
    description: 'Hành động, rẽ nhánh, swimlane',
    icon: 'workflow',
    canvas: true,
  },
  {
    type: 'sequence',
    label: 'Sequence Diagram',
    short: 'Sequence',
    description: 'Lifeline, message, fragment',
    icon: 'arrow-right-left',
    canvas: true,
  },
  {
    type: 'class',
    label: 'Class Diagram',
    short: 'Class',
    description: 'Lớp, thuộc tính, quan hệ',
    icon: 'boxes',
    canvas: true,
  },
  {
    type: 'erd',
    label: 'Sơ đồ cơ sở dữ liệu',
    short: 'ERD',
    description: 'Bảng, khoá, quan hệ, xuất SQL',
    icon: 'database',
    canvas: true,
  },
  {
    type: 'architecture',
    label: 'Sơ đồ kiến trúc',
    short: 'Kiến trúc',
    description: 'Thành phần, nhóm, icon công nghệ',
    icon: 'network',
    canvas: true,
  },
  {
    type: 'gantt',
    label: 'Biểu đồ Gantt',
    short: 'Gantt',
    description: 'Tiến độ theo sprint hoặc module',
    icon: 'gantt-chart',
    canvas: false,
  },
];

export const DIAGRAM_TYPE_BY_ID: Record<DiagramType, DiagramTypeInfo> = Object.fromEntries(
  DIAGRAM_TYPE_INFO.map((t) => [t.type, t]),
) as Record<DiagramType, DiagramTypeInfo>;

export const diagramTypeLabel = (t: string) => DIAGRAM_TYPE_BY_ID[t as DiagramType]?.label ?? t;
