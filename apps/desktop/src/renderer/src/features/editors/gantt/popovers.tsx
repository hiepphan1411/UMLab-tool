// Tooltip chi tiết khi bấm thanh (showTip) và popover cập nhật tiến độ nhanh (openProgPop) — port tool cũ.
import { X } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GST, ddmy, dn, durOf, plannedPct, statusOf, type GanttTask } from '@umlab/core';

/** Đặt khung nổi gần con trỏ, không tràn màn hình. */
function useFloat(cx: number, cy: number, dx: number, dy: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: cx + dx, top: cy + dy, ready: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = cx + dx;
    let y = cy + dy;
    if (x + w > innerWidth - 8) x = dx > 0 && cx - w - 16 > 8 ? cx - w - 16 : innerWidth - w - 8;
    if (y + h > innerHeight - 8) y = Math.max(8, cy - h - 12);
    setPos({ left: Math.max(8, x), top: y, ready: true });
  }, [cx, cy, dx, dy]);
  return { ref, style: { left: pos.left, top: pos.top, visibility: pos.ready ? 'visible' : 'hidden' } as const };
}

export function TaskTip({ t, rd, x, y }: { t: GanttTask; rd: number; x: number; y: number }) {
  const f = useFloat(x, y, 16, 16);
  const st = statusOf(t, rd);
  const c = GST[st].c;
  const pl = plannedPct(t, rd);
  const ms = t.type === 'milestone';
  const done = t.items.filter((i) => i.done).length;
  return (
    <div ref={f.ref} className="gtip" style={f.style} role="tooltip" data-gtip>
      <div className="tt-h">
        <span className="tt-code" style={{ color: c }}>
          {t.code || (ms ? 'Mốc' : '')}
        </span>
        <span className="pill" style={{ background: c + '1F', color: c }}>
          {GST[st].n}
          {t.status !== 'auto' ? ' · đặt tay' : ''}
        </span>
      </div>
      <div className="tt-name">{t.name}</div>
      <div className="tt-grid">
        <span>Thời gian</span>
        <b>{ms ? ddmy(dn(t.start)) : `${ddmy(dn(t.start))} → ${ddmy(dn(t.end))}`}</b>
        {!ms && (
          <>
            <span>Thời lượng</span>
            <b>
              {durOf(t)} ngày ({Math.round((durOf(t) / 7) * 10) / 10} tuần)
            </b>
          </>
        )}
        <span>Phụ trách</span>
        <b>{t.owner || '—'}</b>
        {t.jira && (
          <>
            <span>Jira</span>
            <b>{t.jira}</b>
          </>
        )}
      </div>
      {!ms && (
        <div className="tt-prog">
          <div className="tt-bar">
            <i style={{ width: t.progress + '%', background: c }} />
            <em style={{ left: pl + '%' }} />
          </div>
          <div className="tt-pl">
            <b style={{ color: c }}>{t.progress}% thực tế</b>
            <span>Kế hoạch {pl}%</span>
          </div>
        </div>
      )}
      {t.items.length > 0 && (
        <div className="tt-sec">
          <span>
            Hạng mục · {done}/{t.items.length} xong
          </span>
          {t.items.slice(0, 8).map((it, i) => (
            <div key={i} className={'tt-it' + (it.done ? ' ok' : '')}>
              <i>{it.done ? '✓' : ''}</i>
              {it.t}
            </div>
          ))}
          {t.items.length > 8 && (
            <div className="tt-it" style={{ color: 'var(--muted)' }}>
              … và {t.items.length - 8} hạng mục khác
            </div>
          )}
        </div>
      )}
      {t.goal && (
        <div className="tt-sec">
          <span>Mục tiêu</span>
          <p>{t.goal}</p>
        </div>
      )}
      {t.deliverables && (
        <div className="tt-sec">
          <span>Deliverables</span>
          <p>{t.deliverables}</p>
        </div>
      )}
    </div>
  );
}

export function ProgressPop({
  t,
  rd,
  x,
  y,
  readOnly,
  onProgress,
  onPreview,
  onItem,
  onClose,
  onMore,
}: {
  t: GanttTask;
  rd: number;
  x: number;
  y: number;
  readOnly: boolean;
  onProgress: (v: number) => void;
  onPreview: (v: number | null) => void;
  onItem: (i: number, done: boolean) => void;
  onClose: () => void;
  onMore: () => void;
}) {
  const f = useFloat(x, y, -20, 14);
  const st = statusOf(t, rd);
  const c = GST[st].c;
  const auto = t.autoProg && t.items.length > 0;
  let body: ReactNode;
  if (auto)
    body = (
      <p className="mb-2 text-[11.5px] text-muted">
        Đang tính theo hạng mục: <b style={{ color: c }}>{t.progress}%</b>. Tích hạng mục đã xong:
      </p>
    );
  else
    body = (
      <>
        <div className="gp-big" style={{ color: c }}>
          {t.progress}
          <small>%</small>
        </div>
        <div className="gp-pre">
          {[0, 25, 50, 75, 90, 100].map((v) => (
            <button key={v} className={t.progress === v ? 'on' : ''} disabled={readOnly} onClick={() => onProgress(v)}>
              {v === 100 ? 'Xong' : v + '%'}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={t.progress}
          disabled={readOnly}
          className="w-full"
          style={{ accentColor: c }}
          aria-label="Tiến độ"
          onChange={(e) => onPreview(Number(e.target.value))}
          onPointerUp={(e) => onProgress(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => onProgress(Number((e.target as HTMLInputElement).value))}
        />
      </>
    );
  return (
    <div ref={f.ref} className="gpop" style={f.style} role="dialog" aria-label="Cập nhật tiến độ" data-gpop>
      <div className="gp-h">
        <div className="min-w-0">
          <div className="gp-k">Cập nhật tiến độ</div>
          <div className="gp-n">{t.name}</div>
        </div>
        <button className="ibtn" aria-label="Đóng" onClick={onClose}>
          <X />
        </button>
      </div>
      {body}
      {t.items.length > 0 && (
        <div className="gp-items">
          {t.items.map((it, i) => (
            <label key={i} className="chk">
              <input
                type="checkbox"
                checked={it.done}
                disabled={readOnly}
                onChange={(e) => onItem(i, e.target.checked)}
              />
              <span style={it.done ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>
                {it.t}
              </span>
            </label>
          ))}
        </div>
      )}
      <div className="gp-f">
        <span className="pill" style={{ background: c + '1F', color: c }}>
          {GST[st].n}
        </span>
        <button className="btn outline" style={{ height: 26 }} onClick={onMore}>
          Chi tiết…
        </button>
      </div>
    </div>
  );
}
