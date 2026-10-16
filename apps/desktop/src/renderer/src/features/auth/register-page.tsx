import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { call, errorText, umlab } from '@/lib/api';
import { useConn } from '@/lib/conn';
import { Button, Field, Input, Logo } from '@/ui';
import { AuthLayout } from './auth-layout';
import { PasswordInput } from './login-page';
import { passwordProblem, passwordStrength } from './password';
import { useSession } from './session';

const LEVELS = [
  { label: 'Rất yếu', color: 'var(--danger)' },
  { label: 'Yếu', color: 'var(--danger)' },
  { label: 'Trung bình', color: 'var(--warn)' },
  { label: 'Mạnh', color: 'var(--ok)' },
  { label: 'Rất mạnh', color: 'var(--ok)' },
];

export function StrengthBar({ password }: { password: string }) {
  const s = passwordStrength(password);
  const lv = LEVELS[s];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ background: password && i < Math.max(1, s) ? lv.color : 'var(--line)' }}
          />
        ))}
      </div>
      {password && (
        <p className="mt-1 text-[11.5px]" style={{ color: lv.color }}>
          Độ mạnh: {lv.label}
        </p>
      )}
    </div>
  );
}

export function RegisterPage() {
  const { user, setUser } = useSession();
  const conn = useConn((s) => s.status);
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get('next') || '/projects';

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Hãy nhập họ tên';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Email không hợp lệ';
    const pp = passwordProblem(password);
    if (pp) errs.password = pp;
    if (again !== password) errs.again = 'Mật khẩu nhập lại không khớp';
    setErrors(errs);
    setError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const u = await call(umlab.auth.register({ name, email, password }));
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
      <h1 className="text-[22px] font-semibold tracking-tight">Tạo tài khoản</h1>
      <p className="mt-1 mb-6 text-muted">Một tài khoản dùng chung cho mọi máy cài UMLab của nhóm.</p>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <Field label="Họ tên" error={errors.name}>
          <Input
            id="reg-name"
            size2="lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoFocus
            invalid={!!errors.name}
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input
            id="reg-email"
            size2="lg"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            invalid={!!errors.email}
          />
        </Field>
        <Field
          label="Mật khẩu"
          error={errors.password}
          hint={!errors.password ? 'Ít nhất 8 ký tự, có cả chữ và số.' : undefined}
        >
          <PasswordInput
            id="reg-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            invalid={!!errors.password}
          />
          <StrengthBar password={password} />
        </Field>
        <Field label="Nhập lại mật khẩu" error={errors.again}>
          <PasswordInput
            id="reg-again"
            value={again}
            onChange={setAgain}
            autoComplete="new-password"
            invalid={!!errors.again}
          />
        </Field>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button
          id="reg-submit"
          type="submit"
          variant="primary"
          size="lg"
          loading={busy}
          disabled={conn.state !== 'online'}
        >
          Tạo tài khoản
        </Button>
      </form>
      <p className="mt-6 text-muted">
        Đã có tài khoản?{' '}
        <Link
          to={`/login${params.get('next') ? '?next=' + encodeURIComponent(next) : ''}`}
          className="font-semibold text-accent"
        >
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}
