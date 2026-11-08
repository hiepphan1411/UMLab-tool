// Thao tác ghi mindmap của editor: bọc hàm core (mindmap/doc.ts) với origin LOCAL (có undo, đồng bộ) + chế độ chỉ xem / khoá.
import type * as Y from 'yjs';
import {
  mindAddNode,
  mindMoveNode,
  mindPatchNodes,
  mindRemoveNode,
  mindReplace,
  mindSetMeta,
  mindSetNode,
  type MindmapData,
  type MindmapMeta,
  type MindNode,
} from '@umlab/core';
import { LOCAL } from '../../workspace/session';

export interface MindOps {
  setMeta(p: Partial<MindmapMeta>): void;
  setNode(id: string, p: Partial<MindNode> | ((n: MindNode) => MindNode)): void;
  patch(p: Record<string, Partial<MindNode>>): void;
  add(parentId: string, raw: Partial<MindNode>, afterId?: string | null): MindNode | null;
  remove(id: string): void;
  move(id: string, parentId: string, index: number): boolean;
  replace(d: MindmapData): void;
}

/** `readOnly`: không có quyền sửa project. `locked`: khoá sơ đồ — vẫn cho thu gọn/mở nhánh và mở/khoá lại. */
export function makeOps(doc: Y.Doc, diagramId: string, readOnly: boolean, locked: boolean): MindOps {
  const no = readOnly || locked;
  return {
    // meta luôn ghi được khi có quyền (để bật/tắt khoá)
    setMeta: (p) => {
      if (!readOnly) mindSetMeta(doc, diagramId, p, LOCAL);
    },
    setNode: (id, p) => {
      if (readOnly) return;
      // khi khoá chỉ cho đổi trạng thái thu gọn
      if (locked) {
        if (typeof p === 'function' || Object.keys(p).some((k) => k !== 'collapsed')) return;
      }
      mindSetNode(doc, diagramId, id, p, LOCAL);
    },
    patch: (p) => {
      if (readOnly) return;
      if (locked && Object.values(p).some((x) => Object.keys(x).some((k) => k !== 'collapsed'))) return;
      mindPatchNodes(doc, diagramId, p, LOCAL);
    },
    add: (parentId, raw, afterId) => (no ? null : mindAddNode(doc, diagramId, parentId, raw, afterId, LOCAL)),
    remove: (id) => {
      if (!no) mindRemoveNode(doc, diagramId, id, LOCAL);
    },
    move: (id, parentId, index) => (no ? false : mindMoveNode(doc, diagramId, id, parentId, index, LOCAL)),
    replace: (d) => {
      if (!no) mindReplace(doc, diagramId, d, LOCAL);
    },
  };
}
