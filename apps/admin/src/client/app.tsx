// Trang quản trị UMLab: đăng nhập → Tổng quan (số tài khoản, project, sơ đồ, hoạt động) · Tài khoản (tìm, tạo, xem
// sửa, xoá mềm / khôi phục, lịch sử, đặt lại mật khẩu, đăng xuất mọi nơi).
import {
  Activity,
  ArrowLeft,
  Copy,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  Wifi,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { HashRouter, Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { BarChart } from './charts';
import { TYPE_LABEL, api, fmtDate, fmtDay, timeAgo, type Overview, type UserDetail, type UserRow } from './api';

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    setError('');
    fn()
      .then(setData)
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => reload(), [reload]);
  return { data, error, reload };
}

const Avatar = ({ name, color }: { name: string; color: string }) => (
  <span className="avatar" style={{ background: color }} aria-hidden>
    {name.split(/\s+/).slice(-1)[0]?.charAt(0).toUpperCase()}
  </span>
);

function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="card stat" data-stat={label}>
      <div className="stat-label">
        {icon}
        {label}
      </div>
      <div className="stat-value">{value.toLocaleString('vi-VN')}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Tổng quan -------------------------------------

function Dashboard() {
  const { data, error, reload } = useLoad<Overview>(() => api.overview(), []);
  return (
    <>
      <header className="page-h">
        <h1>Tổng quan</h1>
        <button className="btn outline" onClick={reload}>
          <RefreshCw size={15} /> Làm mới
        </button>
      </header>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Đang tải…</p>}
      {data && (
        <>
          <section className="stats" aria-label="Số liệu chính">
            <Stat
              icon={<Users size={15} />}
              label="Tài khoản"
              value={data.users}
              sub={`+${data.newUsers30d} trong 30 ngày`}
            />
            <Stat icon={<FolderKanban size={15} />} label="Project" value={data.projects} />
            <Stat icon={<Network size={15} />} label="Sơ đồ" value={data.diagrams} />
            <Stat
              icon={<Activity size={15} />}
              label="Hoạt động 7 ngày"
              value={data.activeUsers7d}
              sub="tài khoản có chỉnh sửa"
            />
            <Stat icon={<Wifi size={15} />} label="Đang online" value={data.online} sub="đang mở app" />
          </section>
          <section className="charts">
            <div className="card">
              <BarChart
                title="Sơ đồ theo loại"
                unit="sơ đồ"
                horizontal
                data={Object.keys(TYPE_LABEL).map((t) => ({
                  key: t,
                  label: TYPE_LABEL[t],
                  value: data.diagramsByType[t] ?? 0,
                }))}
              />
            </div>
            <div className="card">
              <BarChart
                title="Số thay đổi mỗi ngày (14 ngày)"
                unit="thay đổi"
                data={data.activity.map((d) => ({
                  key: d.day,
                  label: `${d.day.slice(8, 10)}/${d.day.slice(5, 7)}`,
                  value: d.edits,
                  note: `${d.users} tài khoản chỉnh sửa`,
                }))}
              />
            </div>
          </section>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Tài khoản -------------------------------------

function CreateUser({ onDone }: { onDone: (created: UserRow | null) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ user: UserRow; tempPassword?: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setResult(await api.createUser({ name, email, username, password }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="cu-title">
      <div className="modal">
        <h2 id="cu-title">Tạo tài khoản</h2>
        {result ? (
          <div className="grid">
            <p>
              Đã tạo tài khoản <b>{result.user.username}</b>
              {result.user.username !== result.user.email && <> ({result.user.email})</>}.
            </p>
            {result.tempPassword && (
              <div className="temp">
                <span>Mật khẩu tạm:</span>
                <code data-testid="temp-password">{result.tempPassword}</code>
                <button
                  className="btn outline sm"
                  onClick={() => void navigator.clipboard?.writeText(result.tempPassword!)}
                  aria-label="Sao chép mật khẩu tạm"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}
            <p className="muted small">
              Gửi mật khẩu cho người dùng và nhắc họ đổi trong app (Tài khoản → Đổi mật khẩu).
            </p>
            <div className="actions">
              <button className="btn primary" onClick={() => onDone(result.user)}>
                Xong
              </button>
            </div>
          </div>
        ) : (
          <form className="grid" onSubmit={(e) => void submit(e)}>
            <label>
              <span>Họ tên</span>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>
            <label>
              <span>Email</span>
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              <span>Tên đăng nhập (để trống = dùng email)</span>
              <input
                className="field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={email.trim().toLowerCase() || undefined}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
            <label>
              <span>Mật khẩu (để trống = sinh mật khẩu tạm)</span>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button type="button" className="btn outline" onClick={() => onDone(null)}>
                Huỷ
              </button>
              <button className="btn primary" disabled={busy}>
                <UserPlus size={15} /> Tạo tài khoản
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EditUser({ user, onDone }: { user: UserRow; onDone: (saved: boolean) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username === user.email ? '' : user.username);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.updateUser(user.id, { name, email, username });
      onDone(true);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="eu-title">
      <div className="modal">
        <h2 id="eu-title">Sửa tài khoản</h2>
        <form className="grid" onSubmit={(e) => void submit(e)}>
          <label>
            <span>Họ tên</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
          <label>
            <span>Email</span>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            <span>Tên đăng nhập (để trống = dùng email)</span>
            <input
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={email.trim().toLowerCase() || undefined}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <p className="muted small">Mật khẩu giữ nguyên; người dùng không bị đăng xuất.</p>
          {error && <p className="error">{error}</p>}
          <div className="actions">
            <button type="button" className="btn outline" onClick={() => onDone(false)}>
              Huỷ
            </button>
            <button className="btn primary" disabled={busy}>
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersPage() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleted, setDeleted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error, reload } = useLoad<UserRow[]>(() => api.users(query, deleted), [query, deleted]);
  return (
    <>
      <header className="page-h">
        <h1>
          {deleted ? 'Tài khoản đã xoá' : 'Tài khoản'} {data && <span className="muted">({data.length})</span>}
        </h1>
        <div className="search">
          <Search size={15} />
          <input
            className="field"
            placeholder="Tìm theo tên, email, tên đăng nhập…"
            aria-label="Tìm tài khoản"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="toggle">
          <input type="checkbox" checked={deleted} onChange={(e) => setDeleted(e.target.checked)} />
          Đã xoá
        </label>
        <button className="btn primary" onClick={() => setCreating(true)}>
          <Plus size={15} /> Tạo tài khoản
        </button>
      </header>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table className="table" aria-label="Danh sách tài khoản">
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Tên đăng nhập</th>
              <th>Email</th>
              <th>Ngày tạo</th>
              <th className="num">Project</th>
              <th>Hoạt động gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.id} className="clickable" onClick={() => nav(`/users/${u.id}`)} data-user={u.email}>
                <td>
                  <Link to={`/users/${u.id}`} className="user-cell" onClick={(e) => e.stopPropagation()}>
                    <Avatar name={u.name} color={u.color} />
                    {u.name}
                  </Link>
                </td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{fmtDay(u.createdAt)}</td>
                <td className="num">{u.projects}</td>
                <td title={fmtDate(u.lastActive)}>{timeAgo(u.lastActive)}</td>
              </tr>
            ))}
            {data && !data.length && (
              <tr>
                <td colSpan={6} className="muted">
                  Không có tài khoản phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {creating && (
        <CreateUser
          onDone={(u) => {
            setCreating(false);
            if (u) reload();
          }}
        />
      )}
    </>
  );
}

const ROLE: Record<string, string> = { owner: 'Chủ project', editor: 'Chỉnh sửa', viewer: 'Chỉ xem' };

function UserPage() {
  const { id = '' } = useParams();
  const { data, error, reload } = useLoad<UserDetail>(() => api.user(id), [id]);
  const [notice, setNotice] = useState<ReactNode>(null);
  const [editing, setEditing] = useState(false);
  const act = async (run: () => Promise<unknown>, done: ReactNode) => {
    try {
      await run();
      setNotice(done);
      reload();
    } catch (e) {
      setNotice(<span className="error">{(e as Error).message}</span>);
    }
  };
  const remove = () => {
    if (
      !confirm(
        `Xoá tài khoản “${data?.user.name ?? ''}”?\n\nTài khoản bị đăng xuất ở mọi máy và không đăng nhập được nữa. ` +
          'Project và dữ liệu vẫn giữ nguyên; khôi phục được trong mục “Đã xoá” ở danh sách tài khoản.',
      )
    )
      return;
    void act(() => api.deleteUser(id), 'Đã xoá tài khoản.');
  };
  const restore = () => void act(() => api.restoreUser(id), 'Đã khôi phục tài khoản, người dùng đăng nhập lại được.');
  const reset = async () => {
    if (!confirm('Đặt lại mật khẩu? Mật khẩu cũ không dùng được nữa và mọi máy đang đăng nhập sẽ bị đăng xuất.'))
      return;
    try {
      const { tempPassword } = await api.resetPassword(id);
      setNotice(
        <span className="temp">
          Mật khẩu tạm mới: <code data-testid="temp-password">{tempPassword}</code>
        </span>,
      );
      reload();
    } catch (e) {
      setNotice(<span className="error">{(e as Error).message}</span>);
    }
  };
  const logoutAll = async () => {
    try {
      await api.logoutAll(id);
      setNotice('Đã đăng xuất tài khoản ở mọi thiết bị.');
      reload();
    } catch (e) {
      setNotice(<span className="error">{(e as Error).message}</span>);
    }
  };
  return (
    <>
      <header className="page-h">
        <Link to="/users" className="btn outline">
          <ArrowLeft size={15} /> Tài khoản
        </Link>
        {data && (
          <h1 className="user-cell">
            <Avatar name={data.user.name} color={data.user.color} />
            {data.user.name}
            <span className="muted">
              {data.user.username !== data.user.email ? `${data.user.username}, ${data.user.email}` : data.user.email}
            </span>
          </h1>
        )}
      </header>
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          {data.user.deleted && (
            <p className="notice warn">
              Tài khoản đã xoá lúc {fmtDate(data.user.deletedAt)}
              {data.user.deletedBy && ` (bởi ${data.user.deletedBy})`}. Không đăng nhập được; project và dữ liệu vẫn giữ
              nguyên.
            </p>
          )}
          <section className="stats">
            <Stat icon={<FolderKanban size={15} />} label="Project" value={data.projects.length} />
            <Stat
              icon={<Network size={15} />}
              label="Sơ đồ (trong các project)"
              value={data.projects.reduce((s, p) => s + p.diagrams, 0)}
            />
            <div className="card stat">
              <div className="stat-label">Tạo lúc</div>
              <div className="stat-text">{fmtDate(data.user.createdAt)}</div>
              <div className="muted small">Hoạt động gần nhất: {timeAgo(data.user.lastActive)}</div>
            </div>
            <div className="card stat actions-card">
              <button className="btn outline" onClick={() => setEditing(true)}>
                <Pencil size={15} /> Sửa thông tin
              </button>
              {data.user.deleted ? (
                <button className="btn primary" onClick={restore}>
                  <RotateCcw size={15} /> Khôi phục tài khoản
                </button>
              ) : (
                <>
                  <button className="btn outline" onClick={() => void reset()}>
                    <KeyRound size={15} /> Đặt lại mật khẩu
                  </button>
                  <button className="btn outline" onClick={() => void logoutAll()}>
                    <LogOut size={15} /> Đăng xuất mọi nơi
                  </button>
                  <button className="btn danger" onClick={remove}>
                    <Trash2 size={15} /> Xoá tài khoản
                  </button>
                </>
              )}
            </div>
          </section>
          {notice && <p className="notice">{notice}</p>}
          <section className="two-col">
            <div className="card">
              <h2>Lịch sử</h2>
              <ol className="timeline" aria-label="Lịch sử tài khoản">
                {data.history.map((h, i) => (
                  <li key={i} data-kind={h.kind}>
                    <time dateTime={h.at}>{fmtDate(h.at)}</time>
                    <span>{h.text}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="card">
              <h2>Project ({data.projects.length})</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Vai trò</th>
                    <th className="num">Sơ đồ</th>
                    <th>Sửa gần nhất</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{ROLE[p.role] ?? p.role}</td>
                      <td className="num">{p.diagrams}</td>
                      <td>{timeAgo(p.updatedAt)}</td>
                    </tr>
                  ))}
                  {!data.projects.length && (
                    <tr>
                      <td colSpan={4} className="muted">
                        Chưa tham gia project nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {editing && (
            <EditUser
              user={data.user}
              onDone={(saved) => {
                setEditing(false);
                if (saved) {
                  setNotice('Đã lưu thông tin tài khoản.');
                  reload();
                }
              }}
            />
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- khung & đăng nhập ------------------------------

function Login({ configured, onIn }: { configured: boolean; onIn: (u: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onIn((await api.login(email, password)).user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login">
      <form className="card grid" onSubmit={(e) => void submit(e)} aria-label="Đăng nhập quản trị">
        <h1 className="login-title">
          <BrandLogo height={36} />
          <span>Quản trị</span>
        </h1>
        {!configured && (
          <p className="notice">
            Chưa cấu hình tài khoản quản trị. Đặt <code>UMLAB_ADMIN_EMAILS</code> (email tài khoản UMLab) hoặc{' '}
            <code>UMLAB_ADMIN_PASSWORD</code> trong tệp <code>.env</code> rồi chạy lại.
          </p>
        )}
        <label>
          <span>Email quản trị (hoặc “admin”)</span>
          <input className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        </label>
        <label>
          <span>Mật khẩu</span>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy}>
          Đăng nhập
        </button>
      </form>
    </main>
  );
}

/** Logo UMLab: bản sáng / tối theo theme hệ thống. */
function BrandLogo({ height }: { height: number }) {
  return (
    <picture>
      <source srcSet="./umlab-logo-dark.svg" media="(prefers-color-scheme: dark)" />
      <img src="./umlab-logo.svg" alt="UMLab" style={{ height, display: 'block' }} />
    </picture>
  );
}

function Shell({ user, onOut }: { user: string; onOut: () => void }) {
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <BrandLogo height={26} />
          <span className="muted small">Quản trị</span>
        </div>
        <nav aria-label="Điều hướng">
          <NavLink to="/" end>
            <LayoutDashboard size={16} /> Tổng quan
          </NavLink>
          <NavLink to="/users">
            <Users size={16} /> Tài khoản
          </NavLink>
        </nav>
        <div className="side-foot">
          <span className="muted small">{user}</span>
          <button className="btn outline sm" onClick={onOut}>
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserPage />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  const [s, setS] = useState<{ user: string | null; configured: boolean } | null>(null);
  useEffect(() => {
    api
      .session()
      .then(setS)
      .catch(() => setS({ user: null, configured: false }));
  }, []);
  if (!s) return <p className="muted pad">Đang tải…</p>;
  return (
    <HashRouter>
      {s.user ? (
        <Shell user={s.user} onOut={() => void api.logout().finally(() => setS({ ...s, user: null }))} />
      ) : (
        <Login configured={s.configured} onIn={(user) => setS({ ...s, user })} />
      )}
    </HashRouter>
  );
}
