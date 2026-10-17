import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { connsMap, dataMap, diagramsMap, modelMap, viewsMap } from '@umlab/core';
import { LOCAL, type ProjectSession } from './session';

const MAX_STEPS = 200;

/**
 * Undo/redo cho một sơ đồ: Y.UndoManager theo dõi các map của sơ đồ + mô hình dùng chung,
 * chỉ thao tác của chính mình (origin LOCAL) — thay đổi của người khác không bị hoàn tác.
 * UndoManager tạo trong effect (không phải useMemo): React StrictMode chạy effect mount → cleanup → mount, nếu tạo
 * bằng useMemo thì bản đang dùng đã bị destroy() ở lần cleanup đầu.
 */
export function useUndo(s: ProjectSession, diagramId: string) {
  const [um, setUm] = useState<Y.UndoManager | null>(null);
  const [state, setState] = useState({ canUndo: false, canRedo: false });
  useEffect(() => {
    const m = new Y.UndoManager(
      [
        viewsMap(s.doc, diagramId),
        connsMap(s.doc, diagramId),
        dataMap(s.doc, diagramId),
        modelMap(s.doc),
        diagramsMap(s.doc),
      ],
      {
        trackedOrigins: new Set([LOCAL]),
        captureTimeout: 450,
      },
    );
    const update = () => {
      if (m.undoStack.length > MAX_STEPS) m.undoStack.splice(0, m.undoStack.length - MAX_STEPS);
      setState({ canUndo: m.undoStack.length > 0, canRedo: m.redoStack.length > 0 });
    };
    m.on('stack-item-added', update);
    m.on('stack-item-popped', update);
    m.on('stack-cleared', update);
    setUm(m);
    setState({ canUndo: false, canRedo: false });
    return () => {
      m.off('stack-item-added', update);
      m.off('stack-item-popped', update);
      m.off('stack-cleared', update);
      m.destroy();
      setUm((cur) => (cur === m ? null : cur));
    };
  }, [s, diagramId]);
  return useMemo(
    () => ({
      um,
      ...state,
      undo: () => um?.undo(),
      redo: () => um?.redo(),
      /** Ngắt gộp: thao tác tiếp theo là một bước undo riêng. */
      stop: () => um?.stopCapturing(),
    }),
    [um, state],
  );
}

export type UndoApi = ReturnType<typeof useUndo>;
