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
    if (region.list) {
      // danh sách (thuộc tính, phương thức…): chọn dòng cuối để gõ đè dòng vừa thêm
      const start = el.value.lastIndexOf('\n') + 1;
      el.setSelectionRange(start, el.value.length);
    } else el.select();
    // chỉ chạy khi ô sửa vừa mở
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // commit khi ô sửa đóng (unmount). StrictMode chạy mount → cleanup → mount: chỉ commit nếu sau cleanup không được
  // gắn lại (kiểm ở microtask), nếu không ô sửa sẽ đóng ngay khi vừa mở.
  const mounts = useRef(0);
  useEffect(() => {
    const me = ++mounts.current;
    return () => {
      queueMicrotask(() => {
        // cố ý đọc giá trị mới nhất: đã gắn lại (StrictMode) thì không commit
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (mounts.current === me) commit();
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- gợi ý (kiểu dữ liệu sau dấu :) ----------
  const [sug, setSug] = useState<{ items: string[]; idx: number; from: number; to: number; line: number } | null>(null);
  const refreshSug = (el: HTMLTextAreaElement) => {
    if (!region.suggest) return;
    const pos = el.selectionStart;
    const before = el.value.slice(0, pos);
    const lineStart = before.lastIndexOf('\n') + 1;
    const r = region.suggest(before.slice(lineStart));
    if (!r || !r.items.length || el.selectionEnd !== pos) return setSug(null);
    setSug({
      items: r.items.slice(0, 8),
      idx: 0,
      from: lineStart + r.from,
      to: pos,
      line: before.split('\n').length - 1,
    });
  };
  const accept = (item: string) => {
    const el = ref.current;
    if (!el || !sug) return;
    const nv = value.slice(0, sug.from) + item + value.slice(sug.to);
    setValue(nv);
    setSug(null);
    const caret = sug.from + item.length;
    requestAnimationFrame(() => el.setSelectionRange(caret, caret));
  };

  return (
    <>
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
        onChange={(e) => {
          setValue(e.target.value);
          refreshSug(e.target);
        }}
        onSelect={(e) => sug && refreshSug(e.currentTarget)}
        onBlur={() => {
          setSug(null);
          commit();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (sug) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              const d = e.key === 'ArrowDown' ? 1 : -1;
              setSug({ ...sug, idx: (sug.idx + d + sug.items.length) % sug.items.length });
              return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              accept(sug.items[sug.idx]);
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setSug(null);
              return;
            }
          }
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
                requestAnimationFrame(() =>
                  el.setSelectionRange(Math.max(0, lineStart - 1), Math.max(0, lineStart - 1)),
                );
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
      {sug && (
        <div
          className="menu"
          role="listbox"
          aria-label="Gợi ý"
          style={{
            position: 'absolute',
            zIndex: 21,
            left: b.x * z + st.tx + 8,
            top: b.y * z + st.ty + (sug.line + 1) * fs * 1.4 + 4,
            minWidth: 160,
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {sug.items.map((it, i) => (
            <button
              key={it}
              role="option"
              aria-selected={i === sug.idx}
              className={'menu-item' + (i === sug.idx ? ' active' : '')}
              onClick={() => accept(it)}
            >
              {it}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
