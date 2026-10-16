import { CloudOff, Loader2, Wifi } from 'lucide-react';
import { useState } from 'react';
import { useConn } from '@/lib/conn';
import { useTooltip } from '@/ui';
import { ConnectionDialog } from '../settings/connection-dialog';

const COLORS = {
  online: 'var(--ok)',
  connecting: 'var(--warn)',
  offline: 'var(--danger)',
  unconfigured: 'var(--danger)',
} as const;

/** Trạng thái kết nối MongoDB trên thanh trên; bấm để mở Cài đặt kết nối. */
export function ConnectionBadge({ compact }: { compact?: boolean }) {
  const s = useConn((x) => x.status);
  const [open, setOpen] = useState(false);
  let text: string;
  if (s.state === 'online') text = s.pending ? `${s.pending} thay đổi chờ gửi` : s.realtime ? 'Realtime' : 'Đã kết nối';
  else if (s.state === 'connecting') text = 'Đang kết nối…';
  else if (s.state === 'unconfigured') text = 'Chưa cấu hình DB';
  else text = s.pending ? `Ngoại tuyến · ${s.pending} chờ gửi` : 'Ngoại tuyến';
  const tipText =
    s.state === 'online'
      ? `MongoDB ${s.host} · db ${s.dbName} · ${s.realtime ? 'đồng bộ realtime (change stream)' : 'hỏi vòng 1,5 giây'}`
      : s.error || text;
  const tip = useTooltip(tipText);
  const Icon = s.state === 'online' ? Wifi : s.state === 'connecting' ? Loader2 : CloudOff;
  return (
    <>
      <button
        className="btn sm"
        style={{ color: 'var(--muted)', fontWeight: 400 }}
        onClick={() => setOpen(true)}
        aria-label={tipText}
        {...tip}
      >
        <Icon size={14} className={s.state === 'connecting' ? 'spin' : undefined} style={{ color: COLORS[s.state] }} />
        {!compact && <span>{text}</span>}
      </button>
      <ConnectionDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
