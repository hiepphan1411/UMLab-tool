// Tiện ích dùng chung cho nhóm hình chung: khối chữ, đổ bóng, xử lý ảnh (nén ≤ 1 MB), hộp cắt ảnh chụp màn hình.
import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, openDialog } from '@/ui';
import type { RenderCtx, TextRegion, Tx } from '../../engine/registry';
import { TextLines, wrapText } from '../../engine/text';

export const INK = '#1F2937';
export const NOTE_FILL = '#FFF8D6';
export const NOTE_STROKE = '#C9B458';

export const dashArray = (sw: number) => `${Math.max(4, sw * 3.2)} ${Math.max(3, sw * 2.6)}`;

/** Thuộc tính fill/stroke/dash chuẩn từ style của view. */
export function strokeProps(ctx: RenderCtx, extra: { shadow?: boolean } = {}) {
  const s = ctx.style;
  return {
    fill: s.fill || 'none',
    stroke: s.stroke || 'none',
    strokeWidth: s.strokeWidth,
    strokeDasharray: s.dash ? dashArray(Number(s.strokeWidth) || 1) : undefined,
    filter: extra.shadow ? 'url(#shadow)' : undefined,
  };
}

/**
 * Khối chữ trong hộp (x, y, w, h): ngắt dòng, `**đậm**`, `*nghiêng*`, "- " gạch đầu dòng.
 * valign: căn dọc trong hộp. Trả về null khi đang sửa tại chỗ vùng chữ `key`.
 */
export function TextBlock({
  ctx,
  text,
  box,
  size = 13,
  weight = 400,
  color = INK,
  align = 'center',
  valign = 'middle',
  editKey = 'text',
  lhK = 1.3,
  italic,
}: {
  ctx: RenderCtx;
  text: string;
  box: { x: number; y: number; w: number; h: number };
  size?: number;
  weight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle';
  editKey?: string;
  lhK?: number;
  italic?: boolean;
}) {
  if (ctx.editing === editKey || !text) return null;
  const t = wrapText(text, size, weight, box.w, lhK);
  const x = align === 'center' ? box.x + box.w / 2 : align === 'right' ? box.x + box.w : box.x;
  const y = valign === 'top' ? box.y : box.y + (box.h - t.height) / 2;
  return <TextLines lines={t.lines} x={x} y={y} size={size} color={color} align={align} lh={t.lh} italic={italic} />;
}

/** Chiều cao khối chữ (để measure). */
export const textHeight = (text: string, size: number, weight: number, maxW: number, lhK = 1.3) =>
  text ? wrapText(text, size, weight, maxW, lhK).height : 0;

/** Vùng sửa chữ props[key] của view. */
export function propRegion(
  ctx: RenderCtx,
  key: string,
  box: { x: number; y: number; w: number; h: number },
  o: Partial<Pick<TextRegion, 'multiline' | 'align' | 'fontSize' | 'fontWeight' | 'placeholder'>> = {},
): TextRegion {
  return {
    key,
    box,
    value: String((ctx.props as Record<string, unknown>)[key] ?? ''),
    multiline: o.multiline ?? true,
    align: o.align ?? 'center',
    fontSize: o.fontSize ?? 13,
    fontWeight: o.fontWeight,
    placeholder: o.placeholder,
    commit: (tx: Tx, value: string) => tx.setViewProps(ctx.view.id, { [key]: value }),
  };
}

// ---------------- ảnh ----------------

export const MAX_IMAGE_BYTES = 1024 * 1024;

const dataUrlBytes = (u: string) => Math.ceil(((u.length - u.indexOf(',') - 1) * 3) / 4);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error('Không đọc được ảnh.'));
    img.src = src;
  });
}

/**
 * Chuẩn hoá ảnh để lưu trong sơ đồ: cạnh dài ≤ 2400 px, dung lượng ≤ 1 MB (đổi sang JPEG / thu nhỏ dần nếu cần).
 * SVG giữ nguyên nếu ≤ 1 MB. Trả về data URL + kích thước gốc.
 */
export async function normalizeImage(src: string): Promise<{ src: string; w: number; h: number }> {
  const img = await loadImage(src);
  const w0 = img.naturalWidth || 300;
  const h0 = img.naturalHeight || 200;
  if (src.startsWith('data:image/svg') && dataUrlBytes(src) <= MAX_IMAGE_BYTES) return { src, w: w0, h: h0 };
  let scale = Math.min(1, 2400 / Math.max(w0, h0));
  const isPng = src.startsWith('data:image/png');
  for (let i = 0; i < 8; i++) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * scale));
    c.height = Math.max(1, Math.round(h0 * scale));
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0, c.width, c.height);
    let out = c.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.88);
    if (dataUrlBytes(out) > MAX_IMAGE_BYTES && isPng) {
      // ảnh chụp màn hình PNG lớn: thử JPEG trên nền trắng
      const c2 = document.createElement('canvas');
      c2.width = c.width;
      c2.height = c.height;
      const g2 = c2.getContext('2d')!;
      g2.fillStyle = '#FFFFFF';
      g2.fillRect(0, 0, c2.width, c2.height);
      g2.drawImage(c, 0, 0);
      out = c2.toDataURL('image/jpeg', 0.85);
    }
    if (dataUrlBytes(out) <= MAX_IMAGE_BYTES) return { src: out, w: w0, h: h0 };
    scale *= 0.75;
  }
  throw new Error('Ảnh quá lớn (> 1 MB sau khi nén).');
}

export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(r.error);
    r.readAsDataURL(b);
  });
}

export function bytesToDataUrl(bytes: Uint8Array, name: string): Promise<string> {
  const ext = name.split('.').pop()?.toLowerCase() ?? 'png';
  const mime =
    ext === 'svg'
      ? 'image/svg+xml'
      : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'gif'
          ? 'image/gif'
          : `image/${ext}`;
  return blobToDataUrl(new Blob([bytes as BlobPart], { type: mime }));
}

/** Khung hình vừa với ảnh, giữ tỉ lệ, cạnh dài tối đa `max`. */
export function fitSize(w: number, h: number, max = 360): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(24, Math.round(w * k)), h: Math.max(24, Math.round(h * k)) };
}

// ---------------- hộp cắt ảnh ----------------

/** Hộp chọn vùng ảnh cần giữ (ảnh chụp màn hình). Trả về data URL đã cắt, null nếu huỷ. */
export function cropDialog(src: string, title = 'Ảnh chụp màn hình'): Promise<string | null> {
  return openDialog<string>((done) => <CropView src={src} title={title} done={done} />);
}

function CropView({ src, title, done }: { src: string; title: string; done: (v: string | null) => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const i = new Image();
    i.onload = () => setNat({ w: i.naturalWidth, h: i.naturalHeight });
    i.src = src;
  }, [src]);
  const rel = (e: React.PointerEvent) => {
    const r = imgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };
  const crop = async () => {
    if (!sel || sel.w < 0.01 || sel.h < 0.01) return done(src);
    const img = await loadImage(src);
    const c = document.createElement('canvas');
    c.width = Math.round(sel.w * img.naturalWidth);
    c.height = Math.round(sel.h * img.naturalHeight);
    c.getContext('2d')!.drawImage(
      img,
      sel.x * img.naturalWidth,
      sel.y * img.naturalHeight,
      c.width,
      c.height,
      0,
      0,
      c.width,
      c.height,
    );
    done(c.toDataURL('image/png'));
  };
  return (
    <Dialog
      open
      onClose={() => done(null)}
      title={title}
      width={900}
      footer={
        <>
          <span className="mr-auto text-[11.5px] text-muted">
            {nat.w ? `${nat.w}×${nat.h}px · ` : ''}Kéo trên ảnh để chọn vùng cần giữ.
          </span>
          <Button variant="outline" onClick={() => done(null)}>
            Huỷ
          </Button>
          <Button variant="outline" onClick={() => done(src)}>
            Dùng cả màn hình
          </Button>
          <Button variant="primary" onClick={() => void crop()} disabled={!sel}>
            Cắt vùng chọn
          </Button>
        </>
      }
    >
      <div className="preview" style={{ minHeight: 200 }}>
        <div
          className="relative select-none"
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            start.current = rel(e);
            setSel({ ...start.current, w: 0, h: 0 });
          }}
          onPointerMove={(e) => {
            if (!start.current) return;
            const p = rel(e);
            const s = start.current;
            setSel({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
          }}
          onPointerUp={() => (start.current = null)}
        >
          <img ref={imgRef} src={src} alt="" draggable={false} style={{ display: 'block' }} />
          {sel && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: `${sel.x * 100}%`,
                top: `${sel.y * 100}%`,
                width: `${sel.w * 100}%`,
                height: `${sel.h * 100}%`,
                border: '2px solid var(--accent)',
                boxShadow: '0 0 0 9999px rgba(15,18,26,.45)',
              }}
            />
          )}
        </div>
      </div>
    </Dialog>
  );
}
