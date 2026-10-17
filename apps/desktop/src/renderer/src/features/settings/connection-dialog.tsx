// Cài đặt → Kết nối: chỉ hiển thị trạng thái (chuỗi kết nối cố định trong bản build, không sửa được từ app).
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { connQuality, WEAK_LATENCY_MS } from '@shared/api';
import { umlab } from '@/lib/api';
import { useConn } from '@/lib/conn';
import { Button, Dialog } from '@/ui';
import { ConnIcon, QUALITY } from '../shell/connection-badge';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-[13px] last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

const STATE: Record<string, string> = {
  online: 'Đã kết nối',
  connecting: 'Đang kết nối…',
  offline: 'Mất kết nối',
  unconfigured: 'Bản build chưa có chuỗi kết nối',
};

export function ConnectionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useConn((x) => x.status);
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const q = connQuality(s);
  const retry = async () => {
    setBusy(true);
    try {
      await umlab.conn.retry();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Kết nối & đồng bộ"
      width={460}
      footer={
        <>
          <Button variant="outline" icon={<RefreshCw />} loading={busy} onClick={() => void retry()}>
            Kết nối lại
          </Button>
          <Button variant="primary" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      <div className="grid gap-3" data-testid="conn-status">
        <div
          className="flex items-center gap-3 rounded-lg border border-line p-3"
          style={{ background: 'var(--panel-2)' }}
        >
          <ConnIcon status={s} size={26} />
          <div>
            <div className="font-semibold" style={{ color: QUALITY[q].color }}>
              {QUALITY[q].label}
            </div>
            <div className="text-[12px] text-muted">{QUALITY[q].hint}</div>
          </div>
        </div>
        <div>
          <Row label="Trạng thái">{STATE[s.state] ?? s.state}</Row>
          <Row label="Máy chủ">{s.host ? s.host.replace(/^[^.]+/, (m) => m.slice(0, 3) + '***') : '—'}</Row>
          <Row label="Cơ sở dữ liệu">{s.dbName || '—'}</Row>
          <Row label="Đồng bộ">
            {s.state === 'online' ? (s.realtime ? 'Realtime (change stream)' : 'Hỏi vòng 1,5 giây') : '—'}
          </Row>
          <Row label="Độ trễ">
            {s.state === 'online' && s.latencyMs !== undefined ? (
              <span style={{ color: s.latencyMs >= WEAK_LATENCY_MS ? 'var(--warn)' : undefined }}>
                {s.latencyMs} ms
              </span>
            ) : (
              '—'
            )}
          </Row>
          <Row label="Thay đổi chờ gửi">{s.pending ? `${s.pending} (đã lưu trên máy)` : 'Không có'}</Row>
          {s.error && <Row label="Lỗi gần nhất">{s.error}</Row>}
        </div>
        <p className="text-[12px] text-muted" style={{ lineHeight: 1.5 }}>
          Mọi thay đổi được lưu vào tệp <code>.umlab</code> trên máy trước, rồi tự đồng bộ lên MongoDB khi có mạng.
          Chuỗi kết nối được cấu hình sẵn trong bản cài đặt, không sửa được từ ứng dụng.
        </p>
      </div>
    </Dialog>
  );
}
