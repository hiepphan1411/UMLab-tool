// Xuất ảnh (port hộp "Xuất ảnh" của tool cũ): PNG/JPG/SVG + PDF + sao chép vào clipboard, có xem trước.
import { ClipboardCopy, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Connector, View } from '@umlab/core';
import { umlab } from '@/lib/api';
import { slug } from '@/lib/format';
import { Button, ColorField, Dialog, Segmented, toast } from '@/ui';
import { clamp } from './geometry';
import type { EngineLookup } from './registry';
import { StaticDiagram, contentBox } from './render';
import { FONT_CSS } from './roboto-font';

export type Fmt = 'png' | 'jpg' | 'svg' | 'pdf';
export interface ExportOpts {
  format: Fmt;
  mode: 'scale' | 'width';
  scale: number;
  width: number;
  padding: number;
  bg: 'doc' | 'white' | 'none' | 'custom';
  custom: string;
  quality: number;
  range: 'all' | 'sel';
  page: 'a4' | 'a3';
}

/** Tuỳ chọn nhớ trong phiên làm việc (như tool cũ). */
export const EX: ExportOpts = {
  format: 'png',
  mode: 'scale',
  scale: 2,
  width: 1920,
  padding: 32,
  bg: 'doc',
  custom: '#FFFFFF',
  quality: 0.92,
  range: 'all',
  page: 'a4',
};

export interface ExportSource {
  name: string;
  /** Nền của sơ đồ (tuỳ chọn "Sơ đồ"). */
  docBackground: string;
  hasSelection: boolean;
  /** Dựng SVG đầy đủ (có nhúng font) — `bg` null = trong suốt. */
  build: (o: { range: 'all' | 'sel'; padding: number; bg: string | null }) => { svg: string; W: number; H: number };
}

const SHADOW = `<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#1F2937" flood-opacity=".14"/></filter></defs>`;

/** SVG của một tập hình + đường nối (dùng cho xuất ảnh và ảnh thu nhỏ). */
export function diagramSVG(
  views: View[],
  conns: Connector[],
  lookup: EngineLookup,
  o: { padding: number; bg: string | null; embedFont?: boolean; jumps?: boolean; maxW?: number; maxH?: number },
): { svg: string; W: number; H: number } {
  const b = contentBox(views, conns, lookup) ?? { x: 0, y: 0, w: 100, h: 100 };
  const pad = o.padding;
  const X = Math.floor(b.x - pad);
  const Y = Math.floor(b.y - pad);
  const W = Math.ceil(b.w + pad * 2);
  const H = Math.ceil(b.h + pad * 2);
  const body = renderToStaticMarkup(
    <StaticDiagram views={views} conns={conns} lookup={lookup} bg={o.bg ?? '#FFFFFF'} jumps={o.jumps} />,
  );
  const size = o.maxW
    ? ` width="${o.maxW}" height="${o.maxH}" preserveAspectRatio="xMidYMid meet"`
    : ` width="${W}" height="${H}"`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg"${size} viewBox="${X} ${Y} ${W} ${H}">` +
    (o.embedFont ? `<style>${FONT_CSS}</style>` : '') +
    SHADOW +
    (o.bg ? `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="${o.bg}"/>` : '') +
    `<g font-family="Roboto, 'Helvetica Neue', Arial, sans-serif">${body}</g></svg>`;
  return { svg, W, H };
}

function outSize(W: number, H: number) {
  const k = EX.mode === 'scale' ? EX.scale : clamp(EX.width, 100, 12000) / W;
  return { w: Math.round(W * k), h: Math.round(H * k) };
}

async function toCanvas(svg: string, w: number, h: number, whiteBg: boolean): Promise<HTMLCanvasElement> {
  if (w * h > 268e6) throw new Error('Ảnh quá lớn, hãy giảm tỉ lệ.');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  await new Promise((r) => setTimeout(r, 60));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  if (whiteBg) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

export async function rasterize(src: ExportSource, fmt: Fmt): Promise<{ blob: Blob; w: number; h: number }> {
  const bg =
    EX.bg === 'none' ? null : EX.bg === 'white' ? '#FFFFFF' : EX.bg === 'custom' ? EX.custom : src.docBackground;
  const { svg, W, H } = src.build({ range: EX.range, padding: EX.padding, bg });
  if (fmt === 'svg') return { blob: new Blob([svg], { type: 'image/svg+xml' }), w: W, h: H };
  if (fmt === 'pdf') {
    // PDF một trang, khổ A4/A3, tự xoay ngang/dọc và co vừa; ảnh độ phân giải cao để giữ dấu tiếng Việt chính xác
    const { jsPDF } = await import('jspdf');
    const landscape = W >= H;
    const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: EX.page });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const m = 10;
    const k = Math.min((pw - 2 * m) / W, (ph - 2 * m) / H);
    const scale = clamp(3000 / Math.max(W, H), 1, 4);
    const c = await toCanvas(svg, Math.round(W * scale), Math.round(H * scale), true);
    pdf.addImage(c.toDataURL('image/png'), 'PNG', (pw - W * k) / 2, (ph - H * k) / 2, W * k, H * k);
    return { blob: pdf.output('blob'), w: W, h: H };
  }
  const { w, h } = outSize(W, H);
  const c = await toCanvas(svg, w, h, fmt === 'jpg');
  const blob = await new Promise<Blob>((r) =>
    c.toBlob((b) => r(b!), fmt === 'jpg' ? 'image/jpeg' : 'image/png', EX.quality),
  );
  return { blob, w, h };
}

export async function copyImage(src: ExportSource): Promise<void> {
  const r = await rasterize(src, 'png');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': r.blob })]);
}

const PRESETS: [number, string][] = [
  [1280, 'HD 1280'],
  [1920, 'Full HD 1920'],
  [2560, '2K 2560'],
  [3508, 'A4 ngang 300dpi'],
  [3840, '4K 3840'],
];

export function ExportImageDialog({
  source,
  onClose,
  title = 'Xuất ảnh',
}: {
  source: ExportSource;
  onClose: () => void;
  title?: string;
}) {
  const [, force] = useState(0);
  const [prev, setPrev] = useState<{ url: string; info: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const urlRef = useRef<string | null>(null);
  if (!source.hasSelection) EX.range = 'all';
  const set = (patch: Partial<ExportOpts>) => {
    Object.assign(EX, patch);
    force((x) => x + 1);
  };

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const fmt = EX.format === 'pdf' ? 'png' : EX.format;
        const r = await rasterize(source, fmt);
        if (!alive) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(r.blob);
        const sz =
          r.blob.size / 1024 > 1024
            ? (r.blob.size / 1048576).toFixed(2) + ' MB'
            : Math.round(r.blob.size / 1024) + ' KB';
        setPrev({ url: urlRef.current, info: `${r.w} × ${r.h} px · ${sz} · ${EX.format.toUpperCase()}` });
        setErr(null);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : 'Không dựng được ảnh');
      }
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  });
  useEffect(() => () => void (urlRef.current && URL.revokeObjectURL(urlRef.current)), []);

  const download = async () => {
    setBusy(true);
    try {
      const r = await rasterize(source, EX.format);
      const name = `${slug(source.name)}${EX.format === 'svg' || EX.format === 'pdf' ? '' : '-' + r.w + 'x' + r.h}.${EX.format}`;
      const data = new Uint8Array(await r.blob.arrayBuffer());
      const path = await umlab.files.save({
        defaultName: name,
        filters: [{ name: EX.format.toUpperCase(), extensions: [EX.format] }],
        data,
      });
      if (path) toast('Đã lưu ' + path.split(/[\\/]/).pop());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Không xuất được ảnh', { error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      width={1000}
      footer={
        <>
          <span className="mr-auto self-center text-[11.5px] text-muted">
            {EX.format === 'svg'
              ? 'SVG là vector, phóng to không vỡ nét; font Roboto được nhúng sẵn.'
              : EX.format === 'jpg' && EX.bg === 'none'
                ? 'JPG không hỗ trợ nền trong suốt, sẽ dùng nền trắng.'
                : EX.format === 'pdf'
                  ? `PDF một trang ${EX.page.toUpperCase()}, tự xoay ngang/dọc và co vừa trang.`
                  : ''}
          </span>
          <Button
            variant="outline"
            icon={<ClipboardCopy />}
            onClick={async () => {
              try {
                await copyImage(source);
                toast('Đã sao chép ảnh vào clipboard');
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Không sao chép được', { error: true });
              }
            }}
          >
            Sao chép ảnh
          </Button>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="primary" icon={<Download />} loading={busy} onClick={download}>
            Tải {EX.format === 'pdf' ? 'PDF' : 'ảnh'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0,1fr) 250px' }}>
        <div className="min-w-0">
          <div className="preview">
            {err ? (
              <span className="text-danger">{err}</span>
            ) : prev ? (
              <img src={prev.url} alt="Xem trước ảnh xuất" />
            ) : (
              <span className="text-muted">Đang dựng bản xem trước…</span>
            )}
          </div>
          <p className="mt-2 text-muted tabular-nums">{prev?.info}</p>
        </div>
        <div className="grid content-start gap-3">
          <div>
            <span className="lbl">Định dạng</span>
            <Segmented
              value={EX.format}
              onChange={(format) => set({ format })}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'jpg', label: 'JPG' },
                { value: 'svg', label: 'SVG' },
                { value: 'pdf', label: 'PDF' },
              ]}
            />
          </div>
          <div>
            <span className="lbl">Phạm vi</span>
            <Segmented
              value={EX.range}
              onChange={(range) => set({ range })}
              options={[
                { value: 'all', label: 'Toàn bộ' },
                { value: 'sel', label: 'Vùng chọn', disabled: !source.hasSelection },
              ]}
            />
          </div>
          {EX.format === 'pdf' ? (
            <div>
              <span className="lbl">Khổ giấy</span>
              <Segmented
                value={EX.page}
                onChange={(page) => set({ page })}
                options={[
                  { value: 'a4', label: 'A4' },
                  { value: 'a3', label: 'A3' },
                ]}
              />
            </div>
          ) : (
            <div style={{ opacity: EX.format === 'svg' ? 0.45 : 1 }}>
              <span className="lbl">Kích thước theo</span>
              <Segmented
                value={EX.mode}
                onChange={(mode) => set({ mode })}
                options={[
                  { value: 'scale', label: 'Tỉ lệ' },
                  { value: 'width', label: 'Chiều rộng' },
                ]}
              />
              {EX.mode === 'scale' ? (
                <div className="mt-2">
                  <Segmented
                    value={EX.scale}
                    onChange={(scale) => set({ scale })}
                    options={[1, 2, 3, 4].map((v) => ({ value: v, label: v + 'x' }))}
                  />
                </div>
              ) : (
                <div className="mt-2 grid gap-2">
                  <select
                    className="field"
                    value={PRESETS.some(([v]) => v === EX.width) ? EX.width : ''}
                    onChange={(e) => e.target.value && set({ width: +e.target.value })}
                    aria-label="Kích thước có sẵn"
                  >
                    <option value="">Chọn kích thước có sẵn…</option>
                    {PRESETS.map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <div>
                    <span className="lbl">Chiều rộng (px)</span>
                    <input
                      type="number"
                      className="field"
                      value={EX.width}
                      min={100}
                      max={12000}
                      onChange={(e) => set({ width: +e.target.value || 1920 })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div>
            <span className="lbl">Lề (px)</span>
            <input
              type="number"
              className="field"
              value={EX.padding}
              min={0}
              max={400}
              onChange={(e) => set({ padding: clamp(+e.target.value || 0, 0, 400) })}
            />
          </div>
          <div>
            <span className="lbl">Nền</span>
            <Segmented
              value={EX.bg}
              onChange={(bg) => set({ bg })}
              options={[
                { value: 'doc', label: 'Sơ đồ' },
                { value: 'white', label: 'Trắng' },
                { value: 'none', label: 'Trong suốt' },
                { value: 'custom', label: 'Tuỳ' },
              ]}
            />
            {EX.bg === 'custom' && (
              <div className="mt-2">
                <ColorField value={EX.custom} onChange={(custom) => set({ custom })} />
              </div>
            )}
          </div>
          {EX.format === 'jpg' && (
            <div>
              <span className="lbl">
                Chất lượng JPG: <b>{Math.round(EX.quality * 100)}</b>%
              </span>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.01}
                value={EX.quality}
                className="w-full"
                style={{ accentColor: 'var(--accent)' }}
                onChange={(e) => set({ quality: +e.target.value })}
              />
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
