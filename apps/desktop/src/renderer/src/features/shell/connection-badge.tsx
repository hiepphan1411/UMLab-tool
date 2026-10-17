import { Loader2, Wifi, WifiHigh, WifiLow, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { connQuality, WEAK_LATENCY_MS, type ConnQuality, type ConnStatus } from '@shared/api';
import { useConn } from '@/lib/conn';
import { useTooltip } from '@/ui';
import { ConnectionDialog } from '../settings/connection-dialog';

/** Màu / nhãn theo chất lượng kết nối: xanh = tốt, vàng = yếu / đang đồng bộ, đỏ = mất kết nối. */
export const QUALITY: Record<ConnQuality, { color: string; label: string; hint: string }> = {
  good: { color: 'var(--ok)', label: 'Kết nối tốt', hint: 'Thay đổi được đồng bộ ngay' },
  weak: {
    color: 'var(--warn)',
    label: 'Kết nối yếu / đang đồng bộ',
    hint: 'Vẫn làm việc bình thường — thay đổi đã lưu trên máy, sẽ gửi lên dần',
  },
  down: {
    color: 'var(--danger)',
    label: 'Mất kết nối',
    hint: 'Đang làm việc trên bản lưu ở máy — sẽ tự đồng bộ khi có mạng lại',
  },
};

/** Icon wifi đổi theo chất lượng: đủ vạch xanh / vạch thấp vàng / gạch chéo đỏ; đang kết nối thì xoay. */
export function ConnIcon({ status, size = 14 }: { status: ConnStatus; size?: number }) {
  const q = connQuality(status);
  const color = QUALITY[q].color;
  if (status.state === 'connecting') return <Loader2 size={size} className="spin" style={{ color }} />;
  if (q === 'down') return <WifiOff size={size} style={{ color }} />;
  if (q === 'weak') {
    const I = (status.latencyMs ?? 0) >= WEAK_LATENCY_MS ? WifiLow : WifiHigh;
    return <I size={size} style={{ color }} />;
  }
  return <Wifi size={size} style={{ color }} />;
}

/** Trạng thái kết nối MongoDB trên thanh trên; bấm để xem chi tiết. */
export function ConnectionBadge({ compact }: { compact?: boolean }) {
  const s = useConn((x) => x.status);
  const [open, setOpen] = useState(false);
  const q = connQuality(s);
  let text: string;
  if (s.state === 'online')
    text = s.pending
      ? `Đang đồng bộ ${s.pending}`
      : (s.latencyMs ?? 0) >= WEAK_LATENCY_MS
        ? 'Kết nối yếu'
        : s.realtime
          ? 'Realtime'
          : 'Đã kết nối';
  else if (s.state === 'connecting') text = 'Đang kết nối…';
  else if (s.state === 'unconfigured') text = 'Chưa cấu hình DB';
  else text = s.pending ? `Mất kết nối · ${s.pending} chờ gửi` : 'Mất kết nối';
  const tipText = `${QUALITY[q].label}${s.latencyMs !== undefined && s.state === 'online' ? ` · ${s.latencyMs} ms` : ''} — ${QUALITY[q].hint}`;
  const tip = useTooltip(tipText);
  return (
    <>
      <button
        className="btn sm"
        style={{ color: 'var(--muted)', fontWeight: 400 }}
        onClick={() => setOpen(true)}
        aria-label={tipText}
        data-conn-quality={q}
        {...tip}
      >
        <ConnIcon status={s} />
        {!compact && <span>{text}</span>}
      </button>
      <ConnectionDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
