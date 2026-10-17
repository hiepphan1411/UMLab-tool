import { CircleHelp, Database, KeyRound, LogOut, MonitorSmartphone, Palette, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { call, errorText, umlab } from '@/lib/api';
import { THEME_LABEL, useTheme, type ThemeMode } from '@/lib/theme';
import { Avatar, Button, Dialog, Field, Input, confirmDialog, openMenuAt, toast, type MenuEntry } from '@/ui';
import { ConnectionDialog } from '../settings/connection-dialog';
import { PasswordInput } from './login-page';
import { passwordProblem } from './password';
import { StrengthBar } from './register-page';
import { useSession } from './session';

const COLORS = ['#2E62E6', '#D9463E', '#1F9D66', '#7C5CC4', '#D98A1C', '#0E8A9B', '#C2417E', '#4A6FA5'];

function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setUser } = useSession();
  const [name, setName] = useState(user?.name ?? '');
  const [color, setColor] = useState(user?.color ?? COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      setUser(await call(umlab.auth.updateProfile({ name, color })));
      toast('Đã lưu hồ sơ');
      onClose();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Hồ sơ"
      width={440}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" loading={busy} onClick={save}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={name || '?'} color={color} size={44} />
          <div className="min-w-0">
            <div className="font-semibold">{name || '—'}</div>
            <div className="text-muted">{user?.email}</div>
          </div>
        </div>
        <Field label="Họ tên">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Màu đại diện (hiện ở con trỏ khi cộng tác)">
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                className={'swatchbtn' + (c === color ? ' on' : '')}
                style={{ background: c }}
                aria-label={c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </Field>
        {err && <p className="text-danger">{err}</p>}
      </div>
    </Dialog>
  );
}

function PasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    const p = passwordProblem(pw);
    if (p) return setErr(p);
    if (pw !== again) return setErr('Mật khẩu nhập lại không khớp');
    setBusy(true);
    setErr(null);
    try {
      await call(umlab.auth.changePassword({ currentPassword: cur, newPassword: pw }));
      toast('Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.');
      onClose();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Đổi mật khẩu"
      width={420}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" loading={busy} onClick={save}>
            Đổi mật khẩu
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Mật khẩu hiện tại">
          <PasswordInput id="pw-cur" value={cur} onChange={setCur} autoComplete="current-password" />
        </Field>
        <Field label="Mật khẩu mới">
          <PasswordInput id="pw-new" value={pw} onChange={setPw} autoComplete="new-password" />
          <StrengthBar password={pw} />
        </Field>
        <Field label="Nhập lại mật khẩu mới">
          <PasswordInput id="pw-again" value={again} onChange={setAgain} autoComplete="new-password" />
        </Field>
        {err && <p className="text-danger">{err}</p>}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

/** Avatar chữ cái đầu trên thanh trên: Hồ sơ, Đổi mật khẩu, Giao diện, Kết nối, Đăng xuất. */
export function AccountMenu() {
  const { user, logout } = useSession();
  const theme = useTheme();
  const nav = useNavigate();
  const [dlg, setDlg] = useState<'profile' | 'password' | 'conn' | null>(null);
  if (!user) return null;
  const themeItem = (m: ThemeMode): MenuEntry => ({
    label: THEME_LABEL[m],
    checked: theme.mode === m,
    onSelect: () => theme.set(m),
  });
  const items: MenuEntry[] = [
    { type: 'label', label: user.email },
    { label: 'Hồ sơ', icon: <UserRound />, onSelect: () => setDlg('profile') },
    { label: 'Đổi mật khẩu', icon: <KeyRound />, onSelect: () => setDlg('password') },
    { label: 'Giao diện', icon: <Palette />, children: [themeItem('auto'), themeItem('light'), themeItem('dark')] },
    { label: 'Kết nối cơ sở dữ liệu', icon: <Database />, onSelect: () => setDlg('conn') },
    { label: 'Trợ giúp & phím tắt', icon: <CircleHelp />, shortcut: 'F1', onSelect: () => nav('/help') },
    { type: 'sep' },
    {
      label: 'Đăng xuất',
      icon: <LogOut />,
      onSelect: async () => {
        await logout();
        nav('/login', { replace: true });
      },
    },
    {
      label: 'Đăng xuất mọi thiết bị',
      icon: <MonitorSmartphone />,
      danger: true,
      onSelect: async () => {
        const ok = await confirmDialog({
          title: 'Đăng xuất mọi thiết bị?',
          text: 'Mọi máy đang đăng nhập tài khoản này (kể cả máy này) sẽ phải đăng nhập lại.',
          confirmLabel: 'Đăng xuất tất cả',
          danger: true,
        });
        if (!ok) return;
        try {
          await call(umlab.auth.logoutAll());
          useSession.getState().setUser(null);
          nav('/login', { replace: true });
        } catch (e) {
          toast(errorText(e), { error: true });
        }
      },
    },
  ];
  return (
    <>
      <button
        className="ibtn"
        aria-label={`Tài khoản: ${user.name}`}
        onClick={(e) => openMenuAt(e.currentTarget, items, 'end')}
      >
        <Avatar name={user.name} color={user.color} size={26} />
      </button>
      {dlg === 'profile' && <ProfileDialog open onClose={() => setDlg(null)} />}
      {dlg === 'password' && <PasswordDialog open onClose={() => setDlg(null)} />}
      <ConnectionDialog open={dlg === 'conn'} onClose={() => setDlg(null)} />
    </>
  );
}
