import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Engine } from './engine';
import type { TextRegion } from './registry';
import { DIAGRAM_FONT } from './text';

/**
 * Ô sửa chữ nổi đúng vị trí vùng chữ (docs/spec/engine.md mục 7).
 * Một dòng: Enter xác nhận, Shift+Enter xuống dòng (nếu multiline), Esc huỷ.
 * Compartment (list): mỗi dòng một mục — Enter thêm dòng, Backspace ở dòng rỗng xoá dòng, Tab / Shift+Tab sang ngăn khác,
 * Ctrl+Enter hoặc bấm ra ngoài để xác nhận.
 */
export function TextEditor({
  engine,
  region,
  onDone,
  onTab,
}: {
  engine: Engine;
  region: TextRegion;
  onDone: () => void;
  onTab?: (dir: 1 | -1) => void;
}) {
  const st = engine.store.getState();
  const [value, setValueState] = useState(region.value);
  const valueRef = useRef(region.value);
  const setValue = (v: string) => {
    valueRef.current = v;
    setValueState(v);
  };
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  const z = st.zoom;
  const fs = (region.fontSize ?? 13) * z;
  const b = region.box;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  // tự giãn chiều cao theo số dòng
  const lines = Math.max(1, value.split('\n').length);
  const minH = Math.max(b.h * z, lines * fs * 1.4 + 8);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    const raw = valueRef.current;
    const v = region.list ? raw.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') : raw;
    if (v !== region.value) engine.apply((tx) => region.commit(tx, v));
    onDone();
  };
  const cancel = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => () => void commit(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <textarea
      ref={ref}
      className="absolute z-20 resize-none rounded border-2 outline-none"
      spellCheck={false}
      aria-label="Sửa chữ"
      style={{
        left: b.x * z + st.tx - 2,
        top: b.y * z + st.ty - 2,
        width: Math.max(60, b.w * z + 4),
        height: minH,
        fontSize: fs,
        lineHeight: 1.4,
        fontFamily: DIAGRAM_FONT,
        fontWeight: region.fontWeight ?? 400,
        textAlign: region.align ?? (region.list ? 'left' : 'center'),
        padding: '2px 4px',
        borderColor: 'var(--accent)',
        background: '#FFFFFF',
        color: '#1F2937',
        boxShadow: '0 4px 14px rgba(0,0,0,.18)',
      }}
      value={value}
      placeholder={region.placeholder}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
          return;
        }
        if (region.list) {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            commit();
          } else if (e.key === 'Tab') {
            e.preventDefault();
            commit();
            onTab?.(e.shiftKey ? -1 : 1);
          } else if (e.key === 'Backspace') {
            const el = e.currentTarget;
            const pos = el.selectionStart;
            const before = value.slice(0, pos);
            const lineStart = before.lastIndexOf('\n') + 1;
            const lineEnd = value.indexOf('\n', pos) === -1 ? value.length : value.indexOf('\n', pos);
            if (pos === el.selectionEnd && lineStart === lineEnd && value.length) {
              // dòng rỗng → xoá dòng
              e.preventDefault();
              const nv = value.slice(0, Math.max(0, lineStart - 1)) + value.slice(lineEnd);
              setValue(nv);
              requestAnimationFrame(() => el.setSelectionRange(Math.max(0, lineStart - 1), Math.max(0, lineStart - 1)));
            }
          }
          return;
        }
        if (e.key === 'Enter' && !(e.shiftKey && region.multiline)) {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          commit();
          onTab?.(e.shiftKey ? -1 : 1);
        }
      }}
    />
  );
}
