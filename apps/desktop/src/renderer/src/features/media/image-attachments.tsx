// Ảnh đính kèm dùng ngoài khung vẽ (đặc tả use case, task Gantt…): Ctrl+V ảnh chụp màn hình, kéo thả tệp ảnh,
// chọn tệp; lưới ảnh thu nhỏ, bấm để xem lớn, sửa chú thích, xoá. Ảnh nén ≤ 1 MB trước khi lưu (normalizeImage).
import { ImagePlus, Trash2 } from 'lucide-react';
import { useState, type ClipboardEvent, type DragEvent, type ReactNode } from 'react';
import { uid, type Attachment } from '@umlab/core';
import { umlab } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Dialog, IconButton, openDialog, toast } from '@/ui';
import { blobToDataUrl, bytesToDataUrl, normalizeImage } from '../editors/shapes/common/helpers';

/** Ảnh trong clipboard / kéo thả (null nếu không có ảnh). */
export function imageFiles(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const out: File[] = [];
  for (const it of [...dt.items])
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const f = it.getAsFile();
      if (f) out.push(f);
    }
  if (!out.length) out.push(...[...dt.files].filter((f) => f.type.startsWith('image/')));
  return out;
}

async function toAttachment(src: string, name: string): Promise<Attachment> {
  const n = await normalizeImage(src);
  return { id: uid('img'), name, src: n.src, w: n.w, h: n.h };
}

/** Đọc ảnh từ sự kiện dán / thả → danh sách đính kèm (đã nén). */
export async function attachmentsFrom(files: File[]): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const f of files) {
    try {
      out.push(
        await toAttachment(
          await blobToDataUrl(f),
          f.name && f.name !== 'image.png' ? f.name : `Ảnh dán ${new Date().toLocaleString('vi-VN')}`,
        ),
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    }
  }
  return out;
}

function Preview({ a, done }: { a: Attachment; done: () => void }) {
  return (
    <Dialog open onClose={done} title={a.caption || a.name} width={Math.min(1100, Math.max(420, a.w + 48))}>
      <img
        src={a.src}
        alt={a.caption || a.name}
        style={{ maxWidth: '100%', maxHeight: '72vh', margin: '0 auto', display: 'block' }}
      />
    </Dialog>
  );
}

/**
 * Lưới ảnh đính kèm. Dán (Ctrl+V) khi đang ở trong vùng (kể cả trong ô chữ con), kéo thả tệp ảnh vào, hoặc bấm
 * "Thêm ảnh". `children` (ô ghi chú…) được bọc chung để dán ảnh vào ô chữ cũng thành ảnh đính kèm.
 */
export function ImageAttachments({
  value,
  onChange,
  readOnly,
  label = 'Ảnh',
  children,
}: {
  value: Attachment[];
  onChange: (v: Attachment[]) => void;
  readOnly?: boolean;
  label?: string;
  children?: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const add = async (files: File[]) => {
    const list = await attachmentsFrom(files);
    if (list.length) {
      onChange([...value, ...list]);
      toast(`Đã thêm ${list.length} ảnh`);
    }
  };
  const onPaste = (e: ClipboardEvent) => {
    if (readOnly) return;
    const files = imageFiles(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    void add(files);
  };
  const onDrop = (e: DragEvent) => {
    setOver(false);
    if (readOnly) return;
    const files = imageFiles(e.dataTransfer);
    if (!files.length) return;
    e.preventDefault();
    void add(files);
  };
  const pick = async () => {
    const files = await umlab.files.open({
      filters: [{ name: 'Ảnh', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }],
      multiple: true,
    });
    const list: Attachment[] = [];
    for (const f of files) {
      if (!f.bytes) continue;
      try {
        list.push(await toAttachment(await bytesToDataUrl(f.bytes, f.name), f.name));
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), { error: true });
      }
    }
    if (list.length) onChange([...value, ...list]);
  };
  return (
    <div
      className={cn('att', over && 'over')}
      onPaste={onPaste}
      onDragOver={(e) => {
        if (readOnly || ![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      data-testid="image-attachments"
    >
      {children}
      {(value.length > 0 || !readOnly) && (
        <div className="att-grid" aria-label={label}>
          {value.map((a) => (
            <figure key={a.id} className="att-item">
              <button
                type="button"
                className="att-thumb"
                title="Bấm để xem lớn"
                onClick={() => void openDialog<null>((done) => <Preview a={a} done={() => done(null)} />)}
              >
                <img src={a.src} alt={a.caption || a.name} />
              </button>
              <figcaption>
                <input
                  className="att-cap"
                  aria-label="Chú thích ảnh"
                  defaultValue={a.caption ?? ''}
                  placeholder={a.name}
                  readOnly={readOnly}
                  onBlur={(e) => {
                    const caption = e.target.value.trim();
                    if (caption !== (a.caption ?? ''))
                      onChange(value.map((x) => (x.id === a.id ? { ...x, caption: caption || undefined } : x)));
                  }}
                />
                {!readOnly && (
                  <IconButton label="Xoá ảnh" size="sm" onClick={() => onChange(value.filter((x) => x.id !== a.id))}>
                    <Trash2 />
                  </IconButton>
                )}
              </figcaption>
            </figure>
          ))}
          {!readOnly && (
            <button type="button" className="att-add" onClick={() => void pick()}>
              <ImagePlus size={18} />
              <span>Thêm ảnh</span>
              <span className="text-[11px] text-muted">hoặc Ctrl+V / kéo thả</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
