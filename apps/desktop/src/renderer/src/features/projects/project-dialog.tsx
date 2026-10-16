import { LayoutTemplate, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProjectSummary } from '@shared/api';
import { PROJECT_COLORS, PROJECT_ICONS } from '@/lib/icons';
import { cn } from '@/lib/cn';
import { Button, Dialog, Field, Input, Textarea } from '@/ui';
import type { ProjectForm } from './actions';

/** Hộp thoại tạo / sửa thông tin project: tên, mô tả, màu (8 ô), icon (lưới), mẫu Trống / Mẫu UniPark+. */
export function ProjectDialog({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ProjectSummary | null;
  onSubmit: (f: ProjectForm) => Promise<void>;
}) {
  const editing = !!initial;
  const [f, setF] = useState<ProjectForm>({
    name: '',
    description: '',
    color: PROJECT_COLORS[0],
    icon: 'folder-kanban',
    template: 'blank',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setF(
      initial
        ? {
            name: initial.name,
            description: initial.description,
            color: initial.color,
            icon: initial.icon,
            template: 'blank',
          }
        : { name: '', description: '', color: PROJECT_COLORS[0], icon: 'folder-kanban', template: 'blank' },
    );
  }, [open, initial]);

  const submit = async () => {
    if (!f.name.trim()) return setErr('Hãy nhập tên project');
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({ ...f, name: f.name.trim(), description: f.description.trim() });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const Icon = PROJECT_ICONS[f.icon];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Sửa thông tin project' : 'Tạo project'}
      width={600}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" loading={busy} onClick={submit}>
            {editing ? 'Lưu' : 'Tạo project'}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="grid h-[52px] w-[52px] flex-none place-items-center rounded-xl text-white"
            style={{ background: f.color }}
          >
            {Icon && <Icon size={26} />}
          </span>
          <Field label="Tên project" error={err} className="flex-1">
            <Input
              id="project-name"
              size2="lg"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="VD: UniPark+ — Bãi giữ xe thông minh"
              invalid={!!err}
              data-autofocus
            />
          </Field>
        </div>
        <Field label="Mô tả">
          <Textarea
            rows={2}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            placeholder="Mô tả ngắn về hệ thống"
          />
        </Field>
        <Field label="Màu">
          <div className="flex gap-1.5">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn('swatchbtn', c === f.color && 'on')}
                style={{ background: c }}
                aria-label={'Màu ' + c}
                onClick={() => setF({ ...f, color: c })}
              />
            ))}
          </div>
        </Field>
        <Field label="Icon">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))' }}>
            {Object.entries(PROJECT_ICONS).map(([k, I]) => (
              <button
                key={k}
                type="button"
                aria-label={k}
                className={cn('ibtn', k === f.icon && 'on')}
                style={{ width: '100%', height: 34 }}
                onClick={() => setF({ ...f, icon: k })}
              >
                <I />
              </button>
            ))}
          </div>
        </Field>
        {!editing && (
          <Field label="Bắt đầu từ">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['blank', 'Trống', 'Project rỗng, tự tạo thư mục và sơ đồ.', LayoutTemplate],
                  ['unipark-sample', 'Mẫu UniPark+', 'Thư mục mẫu + sơ đồ kiến trúc + 2 biểu đồ Gantt.', Sparkles],
                ] as const
              ).map(([v, label, desc, I]) => (
                <button
                  key={v}
                  type="button"
                  className="card flex items-start gap-2.5 p-3 text-left"
                  style={{
                    borderColor: f.template === v ? 'var(--accent)' : undefined,
                    background: f.template === v ? 'var(--accent-soft)' : undefined,
                  }}
                  onClick={() => setF({ ...f, template: v })}
                >
                  <I size={18} className="mt-0.5 flex-none text-accent" />
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="mt-0.5 block text-muted" style={{ lineHeight: 1.45 }}>
                      {desc}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
