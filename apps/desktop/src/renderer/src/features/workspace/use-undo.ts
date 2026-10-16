import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { connsMap, dataMap, diagramsMap, modelMap, viewsMap } from '@umlab/core';
import { LOCAL, type ProjectSession } from './session';

const MAX_STEPS = 200;

/**
 * Undo/redo cho một sơ đồ: Y.UndoManager theo dõi các map của sơ đồ + mô hình dùng chung,
 * chỉ thao tác của chính mình (origin LOCAL) — thay đổi của người khác không bị hoàn tác.
 */
export function useUndo(s: ProjectSession, diagramId: string) {
  const um = useMemo(() => {
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
    return m;
  }, [s, diagramId]);
  const [state, setState] = useState({ canUndo: false, canRedo: false });
  useEffect(() => {
    const update = () => {
      if (um.undoStack.length > MAX_STEPS) um.undoStack.splice(0, um.undoStack.length - MAX_STEPS);
      setState({ canUndo: um.undoStack.length > 0, canRedo: um.redoStack.length > 0 });
    };
    um.on('stack-item-added', update);
    um.on('stack-item-popped', update);
    um.on('stack-cleared', update);
    return () => {
      um.off('stack-item-added', update);
      um.off('stack-item-popped', update);
      um.off('stack-cleared', update);
      um.destroy();
    };
  }, [um]);
  return {
    um,
    ...state,
    undo: () => um.undo(),
    redo: () => um.redo(),
    /** Ngắt gộp: thao tác tiếp theo là một bước undo riêng. */
    stop: () => um.stopCapturing(),
  };
}

export type UndoApi = ReturnType<typeof useUndo>;
