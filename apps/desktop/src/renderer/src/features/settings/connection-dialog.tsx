import { useEffect, useState } from 'react';
import type { ConnSettings } from '@shared/api';
import { call, errorText, umlab } from '@/lib/api';
import { useConn } from '@/lib/conn';
import { Button, Dialog, Field, Input, toast } from '@/ui';

function stateLabel(state: string): string {
  if (state === 'online') return 'Đang kết nối';
  if (state === 'connecting') return 'Đang kết nối…';
  if (state === 'unconfigured') return 'Chưa cấu hình';
  return 'Ngoại tuyến';
}

/** Cài đặt → Kết nối: dùng chuỗi kết nối nhúng sẵn hoặc nhập chuỗi MongoDB khác (lưu mã hoá trên máy). */
export function ConnectionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const status = useConn((s) => s.status);
  const [settings, setSettings] = useState<ConnSettings | null>(null);
  const [custom, setCustom] = useState(false);
  const [uri, setUri] = useState('');
  const [db, setDb] = useState('umlab');
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    void umlab.conn.getSettings().then((s) => {
      setSettings(s);
      setCustom(!s.usingBuiltIn);
      setUri(s.mongoUri);
      setDb(s.dbName);
    });
  }, [open]);

  const test = async () => {
    setBusy('test');
    setMsg(null);
    try {
      const r = await call(umlab.conn.test({ mongoUri: uri, dbName: db }));
      setMsg({
        ok: true,
        text: `Kết nối được tới ${r.host}. ${r.realtime ? 'Hỗ trợ đồng bộ realtime.' : 'Không có change stream — app sẽ hỏi vòng mỗi 1,5 giây.'}`,
      });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy('save');
    try {
      await call(umlab.conn.saveSettings(custom ? { mongoUri: uri, dbName: db } : null));
      toast('Đã lưu cài đặt kết nối');
      onClose();
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const dot = status.state === 'online' ? 'var(--ok)' : status.state === 'connecting' ? 'var(--warn)' : 'var(--danger)';
  const detail =
    status.state === 'online'
      ? `Database “${status.dbName}” · ${status.realtime ? 'đồng bộ realtime qua change stream' : 'hỏi vòng 1,5 giây'}${status.pending ? ` · ${status.pending} thay đổi chờ gửi` : ''}`
      : status.error || 'Mọi thay đổi vẫn được giữ trên máy và tự gửi khi có kết nối.';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Kết nối cơ sở dữ liệu"
      width={600}
      footer={
        <>
          {custom && (
            <Button variant="outline" className="mr-auto" loading={busy === 'test'} onClick={test} disabled={!uri}>
              Thử kết nối
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" loading={busy === 'save'} onClick={save} disabled={custom && !uri}>
            Lưu & kết nối lại
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="card flex items-center gap-3 p-3" style={{ background: 'var(--panel-2)' }}>
          <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: dot }} />
          <div className="min-w-0">
            <div className="font-semibold">
              {stateLabel(status.state)}
              {status.host && <span className="font-normal text-muted"> · {status.host}</span>}
            </div>
            <div className="text-muted">{detail}</div>
          </div>
        </div>
        <div className="seg" role="radiogroup">
          <button className={!custom ? 'on' : ''} onClick={() => setCustom(false)} disabled={!settings}>
            Dùng kết nối có sẵn
          </button>
          <button className={custom ? 'on' : ''} onClick={() => setCustom(true)}>
            Chuỗi kết nối khác
          </button>
        </div>
        {custom ? (
          <>
            <Field
              label="Chuỗi kết nối MongoDB"
              hint="Ví dụ mongodb+srv://user:mat-khau@cluster.mongodb.net/ — lưu mã hoá trên máy này."
            >
              <Input
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder="mongodb+srv://…"
                spellCheck={false}
                autoComplete="off"
              />
            </Field>
            <Field label="Tên database">
              <Input value={db} onChange={(e) => setDb(e.target.value)} placeholder="umlab" />
            </Field>
          </>
        ) : (
          <p className="text-muted" style={{ lineHeight: 1.6 }}>
            Bản cài đặt này đi kèm kết nối tới cluster MongoDB của nhóm. Mọi người dùng cùng kết nối sẽ thấy project
            được chia sẻ và chỉnh sửa cùng lúc.
          </p>
        )}
        {msg && <p style={{ color: msg.ok ? 'var(--ok)' : 'var(--danger)', lineHeight: 1.5 }}>{msg.text}</p>}
      </div>
    </Dialog>
  );
}
