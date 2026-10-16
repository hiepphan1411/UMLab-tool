import { LogOut, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { ProjectSummary, Role } from '@shared/api';
import { call, errorText, umlab } from '@/lib/api';
import { Avatar, Button, Dialog, IconButton, Input, Select, confirmDialog, toast } from '@/ui';
import { useSession } from '../auth/session';

const ROLE_LABEL: Record<Role, string> = { owner: 'Chủ project', editor: 'Chỉnh sửa', viewer: 'Chỉ xem' };

/** Chia sẻ project: mời bằng email tài khoản UMLab, đổi vai trò, gỡ thành viên, rời project. */
export function ShareDialog({
  project,
  onClose,
  onChanged,
}: {
  project: ProjectSummary;
  onClose: () => void;
  onChanged: (p: ProjectSummary | null) => void;
}) {
  const me = useSession((s) => s.user);
  const [p, setP] = useState(project);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isOwner = p.role === 'owner';

  const apply = (np: ProjectSummary) => {
    setP(np);
    onChanged(np);
  };

  const add = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      apply(await call(umlab.projects.addMember(p.id, email.trim(), role)));
      toast('Đã thêm thành viên');
      setEmail('');
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Chia sẻ “${p.name}”`} width={560}>
      <div className="grid gap-4">
        {isOwner && (
          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <span className="lbl">Mời bằng email tài khoản UMLab</span>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban-cung-nhom@truong.edu.vn"
                type="email"
              />
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                options={[
                  { value: 'editor', label: 'Chỉnh sửa' },
                  { value: 'viewer', label: 'Chỉ xem' },
                ]}
                style={{ width: 130 }}
              />
              <Button type="submit" variant="primary" icon={<UserPlus />} loading={busy}>
                Mời
              </Button>
            </div>
            {err && <p className="text-danger">{err}</p>}
          </form>
        )}
        <div>
          <span className="lbl">{p.members.length} thành viên</span>
          <div className="card divide-y divide-[var(--line)]">
            {p.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 px-3 py-2">
                <Avatar name={m.name} color={m.color} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {m.name}
                    {m.userId === me?.id && <span className="font-normal text-muted"> (bạn)</span>}
                  </div>
                  <div className="truncate text-muted">{m.email}</div>
                </div>
                {isOwner && m.role !== 'owner' ? (
                  <>
                    <Select
                      value={m.role}
                      onChange={async (e) => {
                        try {
                          apply(await call(umlab.projects.setMemberRole(p.id, m.userId, e.target.value as Role)));
                        } catch (er) {
                          toast(errorText(er), { error: true });
                        }
                      }}
                      options={[
                        { value: 'editor', label: 'Chỉnh sửa' },
                        { value: 'viewer', label: 'Chỉ xem' },
                      ]}
                      style={{ width: 120 }}
                    />
                    <IconButton
                      label={`Gỡ ${m.name}`}
                      onClick={async () => {
                        if (
                          !(await confirmDialog({
                            title: 'Gỡ thành viên?',
                            text: `${m.name} sẽ không mở được project này nữa.`,
                            confirmLabel: 'Gỡ',
                            danger: true,
                          }))
                        )
                          return;
                        try {
                          apply(await call(umlab.projects.removeMember(p.id, m.userId)));
                        } catch (er) {
                          toast(errorText(er), { error: true });
                        }
                      }}
                    >
                      <Trash2 />
                    </IconButton>
                  </>
                ) : (
                  <span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
                    {ROLE_LABEL[m.role]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        {!isOwner && me && (
          <div className="flex justify-end">
            <Button
              variant="ghost-danger"
              icon={<LogOut />}
              onClick={async () => {
                if (
                  !(await confirmDialog({
                    title: 'Rời project?',
                    text: 'Bạn sẽ không thấy project này nữa cho tới khi được mời lại.',
                    confirmLabel: 'Rời project',
                    danger: true,
                  }))
                )
                  return;
                try {
                  await call(umlab.projects.removeMember(p.id, me.id));
                  onChanged(null);
                  onClose();
                } catch (er) {
                  toast(errorText(er), { error: true });
                }
              }}
            >
              Rời project
            </Button>
          </div>
        )}
        <p className="text-muted" style={{ lineHeight: 1.55 }}>
          Mọi thành viên mở project sẽ thấy thay đổi của nhau ngay lập tức, kể cả con trỏ khi cùng xem một sơ đồ.
        </p>
      </div>
    </Dialog>
  );
}
