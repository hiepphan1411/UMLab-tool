// Lấy chữ từ vùng chọn trên trang (PDF có chữ → lấy trực tiếp; trang scan → OCR của Windows) và popup kết quả:
// sửa lại chữ, chép, dịch, phiên âm IPA, nghe.
import { Copy, Languages, Volume2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { call, errorText, umlab } from '@/lib/api';
import { Button, toast } from '@/ui';
import { loadIpa, sentenceIpa } from './ipa';
import { sayNow } from './speech';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Cắt vùng `r` (0–1) của ảnh/canvas nguồn → PNG bytes, phóng to để OCR đọc tốt hơn. */
export async function cropToPng(src: HTMLCanvasElement | HTMLImageElement, r: Region): Promise<Uint8Array> {
  const sw = src instanceof HTMLImageElement ? src.naturalWidth : src.width;
  const sh = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
  const sx = Math.max(0, Math.round(r.x * sw));
  const sy = Math.max(0, Math.round(r.y * sh));
  const w = Math.max(1, Math.min(sw - sx, Math.round(r.w * sw)));
  const h = Math.max(1, Math.min(sh - sy, Math.round(r.h * sh)));
  // OCR cần chữ cao ~20 px trở lên → phóng to vùng nhỏ (tối đa 3×, tối đa 3000 px)
  const scale = Math.min(3, Math.max(1, 1600 / Math.max(w, 1)), 3000 / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, w, h, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Không cắt được ảnh vùng chọn.');
  return new Uint8Array(await blob.arrayBuffer());
}

export async function ocrRegion(src: HTMLCanvasElement | HTMLImageElement | null, r: Region): Promise<string> {
  if (!src) throw new Error('Trang chưa hiện xong, thử lại sau một chút.');
  return call(umlab.vstep.ocr(await cropToPng(src, r)));
}

export function ExtractPopup({
  region,
  extract,
  onClose,
}: {
  region: Region;
  extract: (r: Region) => Promise<string>;
  onClose: () => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [vi, setVi] = useState<string | null>(null);
  const [ipa, setIpa] = useState<string | null>(null);
  const [busy, setBusy] = useState<'tr' | 'ipa' | null>(null);

  useEffect(() => {
    let alive = true;
    extract(region)
      .then((t) => alive && setText(t.trim()))
      .catch((e) => alive && setErr(errorText(e)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  const oneLine = (text ?? '').replace(/-\n(?=[a-z])/g, '').replace(/\s*\n\s*/g, ' ');
  const translate = async () => {
    setBusy('tr');
    try {
      setVi(await call(umlab.vstep.translate(oneLine.slice(0, 1500))));
    } catch (e) {
      setVi('⚠ ' + errorText(e));
    } finally {
      setBusy(null);
    }
  };
  const showIpa = async () => {
    setBusy('ipa');
    await loadIpa();
    setIpa('/' + sentenceIpa(oneLine) + '/');
    setBusy(null);
  };

  const below = region.y + region.h < 0.72;
  return (
    <div
      className="an-extract"
      style={{
        left: `${Math.min(region.x * 100, 60)}%`,
        top: below ? `calc(${(region.y + region.h) * 100}% + 8px)` : undefined,
        bottom: below ? undefined : `calc(${(1 - region.y) * 100}% + 8px)`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="an-extract-head">
        <b>Chữ trong vùng chọn</b>
        <button className="ibtn" onClick={onClose} aria-label="Đóng">
          <X size={14} />
        </button>
      </div>
      {err ? (
        <p className="text-danger">{err}</p>
      ) : text == null ? (
        <p className="text-muted">Đang nhận dạng chữ…</p>
      ) : !text ? (
        <p className="text-muted">Không tìm thấy chữ trong vùng này. Thử chọn rộng hơn một chút.</p>
      ) : (
        <>
          <textarea
            className="field an-extract-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          <div className="an-extract-actions">
            <Button
              size="sm"
              icon={<Copy />}
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                toast('Đã chép');
              }}
            >
              Chép
            </Button>
            <Button size="sm" icon={<Languages />} loading={busy === 'tr'} onClick={() => void translate()}>
              Dịch
            </Button>
            <Button size="sm" loading={busy === 'ipa'} onClick={() => void showIpa()}>
              IPA
            </Button>
            <Button size="sm" icon={<Volume2 />} onClick={() => sayNow(oneLine)}>
              Nghe
            </Button>
          </div>
          {ipa && <div className="an-extract-ipa">{ipa}</div>}
          {vi && <div className="an-extract-vi">{vi}</div>}
          <div className="vs-muted-line">
            Trang scan được nhận dạng bằng OCR tiếng Anh của Windows: chữ tiếng Việt có dấu có thể sai, hãy sửa trong ô
            trên trước khi chép.
          </div>
        </>
      )}
    </div>
  );
}
