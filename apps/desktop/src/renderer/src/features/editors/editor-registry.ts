import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import type * as Y from 'yjs';
import type { DiagramRecord, DiagramMeta, DiagramType, ModelElement } from '@umlab/core';
import type { ProjectSession } from '../workspace/session';
import type { UndoApi } from '../workspace/use-undo';

/** Hành động trên thanh trên của editor mà từng loại sơ đồ cung cấp. */
export interface EditorActions {
  exportImage?: () => void;
  exportJson?: () => void;
  importJson?: () => void;
  check?: () => void;
  /** Số cảnh báo hiển thị cạnh nút Kiểm tra. */
  issues?: number;
  /** Nút bổ sung riêng của loại sơ đồ (Sinh Activity, Parse ORM → ERD…). */
  extra?: ReactNode;
}

export interface EditorProps {
  session: ProjectSession;
  diagram: DiagramMeta;
  undo: UndoApi;
  readOnly: boolean;
  setActions: (a: EditorActions) => void;
}

const editors = new Map<string, ComponentType<EditorProps>>();

export function registerEditor(type: DiagramType | 'playground', comp: ComponentType<EditorProps>): void {
  editors.set(type, comp);
}

export const getEditor = (type: string) => editors.get(type);

export const EditorContext = createContext<EditorProps | null>(null);
export function useEditorContext(): EditorProps {
  const c = useContext(EditorContext);
  if (!c) throw new Error('useEditorContext ngoài editor');
  return c;
}

/** Nội dung khởi tạo của sơ đồ mới (theo mẫu). */
export type DiagramInit = Partial<Pick<DiagramRecord, 'views' | 'connectors' | 'data' | 'canvas'>> & {
  model?: ModelElement[];
};

/** Mẫu khi tạo sơ đồ mới (Trống / Kiến trúc UniPark+ / Gantt theo sprint…). Mẫu đầu tiên là mặc định. */
export interface DiagramTemplate {
  id: string;
  label: string;
  description?: string;
  build: (ctx: { doc: Y.Doc; name: string }) => DiagramInit | Promise<DiagramInit>;
}

const templates = new Map<string, DiagramTemplate[]>();
export function registerDiagramTemplates(type: DiagramType | 'playground', list: DiagramTemplate[]): void {
  templates.set(type, list);
}
export const getDiagramTemplates = (type: string) => templates.get(type) ?? [];
