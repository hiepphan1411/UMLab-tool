import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { call, errorText, umlab } from '@/lib/api';
import { useConn } from '@/lib/conn';
import { Button, Checkbox, Field, Input, Logo } from '@/ui';
import { AuthLayout } from './auth-layout';
import { useSession } from './session';

export function PasswordInput({
  value,
  onChange,
  id,
  autoComplete,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
  autoComplete: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        size2="lg"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        invalid={invalid}
        style={{ paddingRight: 36 }}
      />
      <button
        type="button"
        className="ibtn absolute top-1/2 right-1 -translate-y-1/2"
        style={{ width: 28, height: 28 }}
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        onClick={() => setShow((s) => !s)}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const { user, setUser, endedReason } = useSession();
  const conn = useConn((s) => s.status);
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get('next') || '/projects';

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError('Hãy nhập email và mật khẩu');
    setBusy(true);
    try {
      const u = await call(umlab.auth.login({ email, password, remember }));
      setUser(u);
      nav(next, { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <Logo height={44} className="mb-8" />
      <h1 className="text-[22px] font-semibold tracking-tight">Đăng nhập</h1>
      <p className="mt-1 mb-6 text-muted">Chào mừng trở lại. Đăng nhập để mở các project của bạn.</p>
      {endedReason && (
        <p className="mb-4 rounded-lg px-3 py-2" style={{ background: 'var(--accent-soft)', lineHeight: 1.5 }}>
          {endedReason}
        </p>
      )}
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <Field label="Email">
          <Input
            id="login-email"
            size2="lg"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            placeholder="ban@truong.edu.vn"
          />
        </Field>
        <Field label="Mật khẩu">
          <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <Checkbox label="Ghi nhớ đăng nhập" checked={remember} onChange={setRemember} />
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button
          id="login-submit"
          type="submit"
          variant="primary"
          size="lg"
          loading={busy}
          disabled={conn.state !== 'online' && conn.state !== 'connecting'}
        >
          Đăng nhập
        </Button>
        {conn.state !== 'online' && (
          <p className="text-muted">
            {conn.state === 'connecting'
              ? 'Đang kết nối cơ sở dữ liệu…'
              : conn.error || 'Chưa kết nối được cơ sở dữ liệu.'}
          </p>
        )}
      </form>
      <p className="mt-6 text-muted">
        Chưa có tài khoản?{' '}
        <Link
          to={`/register${params.get('next') ? '?next=' + encodeURIComponent(next) : ''}`}
          className="font-semibold text-accent"
        >
          Tạo tài khoản
        </Link>
      </p>
    </AuthLayout>
  );
}
