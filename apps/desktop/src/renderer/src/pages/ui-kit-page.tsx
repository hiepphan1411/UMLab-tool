import {
  ArrowLeft,
  Copy,
  FilePlus,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UML_ICONS } from '@umlab/uml-icons';
import { ThemeButton } from '@/features/shell/theme-button';
import { Spacer, TopBar } from '@/features/shell/top-bar';
import {
  Avatar,
  Button,
  Checkbox,
  ColorField,
  Dialog,
  DropdownMenu,
  EmptyState,
  Field,
  IconButton,
  Input,
  Kbd,
  Logo,
  NumberField,
  Segmented,
  Select,
  Spinner,
  Tabs,
  Textarea,
  Tree,
  choiceDialog,
  confirmDialog,
  openContextMenu,
  promptDialog,
  toast,
  type MenuEntry,
  type TreeNode,
} from '@/ui';

const TREE: TreeNode[] = [
  {
    id: 'f1',
    label: 'Phân tích',
    isFolder: true,
    children: [
      { id: 'd1', label: 'Use Case tổng quát', icon: <Workflow size={14} /> },
      {
        id: 'f2',
        label: 'Đặc tả',
        isFolder: true,
        children: [{ id: 'd2', label: 'UC03 Check-in xe vào bãi', icon: <FilePlus size={14} /> }],
      },
    ],
  },
  { id: 'f3', label: 'Thiết kế', isFolder: true, children: [] },
  { id: 'd3', label: 'Kiến trúc UniPark+', icon: <Workflow size={14} />, hint: 'Gốc' },
];

/** Trang /_ui (chỉ bản dev): xem đủ component UI kit ở cả sáng và tối (đổi theme bằng nút trên thanh). */
export function UiKitPage() {
  const nav = useNavigate();
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [chk, setChk] = useState(true);
  const [color, setColor] = useState('#2E62E6');
  const [num, setNum] = useState(12);
  const [tab, setTab] = useState<'one' | 'two'>('one');
  const [dlg, setDlg] = useState(false);
  const [expanded, setExpanded] = useState(new Set(['f1']));
  const [selected, setSelected] = useState(new Set<string>());
  const [renaming, setRenaming] = useState<string | null>(null);

  const menu: MenuEntry[] = [
    { label: 'Mở', icon: <FolderOpen />, shortcut: 'Enter' },
    { label: 'Đổi tên', icon: <Pencil />, shortcut: 'F2' },
    {
      label: 'Sơ đồ mới',
      icon: <Plus />,
      children: [{ label: 'Use Case Diagram' }, { label: 'Class Diagram' }, { label: 'Activity Diagram' }],
    },
    { type: 'sep' },
    { label: 'Nhân bản', icon: <Copy /> },
    { label: 'Xoá', icon: <Trash2 />, danger: true },
  ];

  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <IconButton label="Quay lại" onClick={() => nav(-1)}>
          <ArrowLeft />
        </IconButton>
        <Logo height={24} />
        <span className="text-muted">UI kit</span>
        <Spacer />
        <ThemeButton />
      </TopBar>
      <div className="scroll p-6">
        <div
          className="mx-auto grid max-w-[1100px] gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
        >
          <section className="card grid gap-3 p-4">
            <div className="sec-h">Button</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon={<Plus />}>
                Primary
              </Button>
              <Button variant="outline">Outline</Button>
              <Button>Ghost</Button>
              <Button variant="danger" icon={<Trash2 />}>
                Danger
              </Button>
              <Button variant="primary" loading>
                Đang lưu
              </Button>
              <Button variant="outline" disabled>
                Disabled
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <IconButton label="Cài đặt">
                <Settings />
              </IconButton>
              <IconButton label="Đang bật" active>
                <Pencil />
              </IconButton>
              <IconButton label="Nhỏ" size="sm">
                <MoreHorizontal />
              </IconButton>
              <span className="sep" />
              <Kbd>Ctrl + Z</Kbd>
              <Spinner />
              <Avatar name="Phan Hiệp" color="#2E62E6" />
              <Avatar name="Giang" color="#1F9D66" size={22} />
            </div>
          </section>

          <section className="card grid gap-3 p-4">
            <div className="sec-h">Input</div>
            <Field label="Tên project">
              <Input placeholder="UniPark+" />
            </Field>
            <Field label="Lỗi" error="Hãy nhập tên">
              <Input invalid />
            </Field>
            <Field label="Mô tả">
              <Textarea placeholder="Mô tả ngắn" />
            </Field>
            <div className="row2">
              <Field label="Select">
                <Select
                  options={[
                    { value: 'pg', label: 'PostgreSQL' },
                    { value: 'my', label: 'MySQL' },
                  ]}
                />
              </Field>
              <Field label="Số">
                <NumberField value={num} onChange={setNum} />
              </Field>
            </div>
            <Field label="Màu">
              <ColorField value={color} onChange={setColor} />
            </Field>
            <Checkbox label="Ghi nhớ đăng nhập" checked={chk} onChange={setChk} />
            <Segmented
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'a', label: 'Ngày' },
                { value: 'b', label: 'Tuần' },
                { value: 'c', label: 'Tháng' },
              ]}
            />
          </section>

          <section className="card grid content-start gap-3 p-4">
            <div className="sec-h">Dialog, menu, toast</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setDlg(true)}>
                Dialog
              </Button>
              <Button
                variant="outline"
                onClick={async () =>
                  toast(
                    (await confirmDialog({
                      title: 'Xoá project?',
                      text: 'Không hoàn tác được.',
                      danger: true,
                      confirmLabel: 'Xoá',
                      requireText: 'UniPark+',
                    }))
                      ? 'Đã xoá'
                      : 'Đã huỷ',
                  )
                }
              >
                ConfirmDialog
              </Button>
              <Button
                variant="outline"
                onClick={async () =>
                  toast(
                    'Tên: ' +
                      ((await promptDialog({ title: 'Đổi tên', label: 'Tên mới', initial: 'Sơ đồ 1' })) ?? '(huỷ)'),
                  )
                }
              >
                Prompt
              </Button>
              <Button
                variant="outline"
                onClick={async () =>
                  toast(
                    String(
                      await choiceDialog({
                        title: 'Nhập JSON',
                        text: 'Thêm vào sơ đồ hiện tại hay thay thế?',
                        options: [
                          { value: 'merge', label: 'Gộp thêm' },
                          { value: 'replace', label: 'Thay thế', variant: 'primary' },
                        ],
                      }),
                    ),
                  )
                }
              >
                Choice
              </Button>
              <DropdownMenu items={menu}>
                {(p) => (
                  <Button variant="outline" {...p}>
                    Dropdown ▾
                  </Button>
                )}
              </DropdownMenu>
              <Button variant="outline" onClick={() => toast('Đã lưu')}>
                Toast
              </Button>
              <Button variant="outline" onClick={() => toast('Không kết nối được', { error: true })}>
                Toast lỗi
              </Button>
            </div>
            <div
              className="grid h-20 place-items-center rounded-lg border border-dashed border-line text-muted"
              onContextMenu={(e) => openContextMenu(e, menu)}
            >
              Chuột phải vào đây (ContextMenu)
            </div>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'one', label: 'Palette' },
                { value: 'two', label: 'Lớp' },
              ]}
            />
            <p className="text-muted">Tab đang chọn: {tab}</p>
          </section>

          <section className="card grid content-start gap-2 p-3">
            <div className="sec-h px-1 pt-1">Tree (kéo thả, F2, ↑↓←→)</div>
            <Tree
              nodes={TREE}
              expanded={expanded}
              onToggle={(id, open) =>
                setExpanded((s) => (open ? new Set(s).add(id) : new Set([...s].filter((x) => x !== id))))
              }
              selected={selected}
              onSelect={(ids) => setSelected(ids)}
              onOpen={(id) => toast('Mở ' + id)}
              onMove={(ids, t, pos) => toast(`Chuyển ${ids.join(', ')} → ${pos} ${t ?? 'gốc'}`)}
              renamingId={renaming}
              onRequestRename={setRenaming}
              onRename={(id, name) => toast(`Đổi tên ${id} → ${name}`)}
              onRenameEnd={() => setRenaming(null)}
              onContextMenu={(e) => openContextMenu(e, menu)}
              ariaLabel="Cây mẫu"
            />
          </section>

          <section className="card p-4">
            <div className="sec-h">Icon UML ({Object.keys(UML_ICONS).length})</div>
            <div className="grid grid-cols-8 gap-2">
              {Object.entries(UML_ICONS).map(([k, v]) => (
                <span
                  key={k}
                  title={k}
                  className="grid h-8 place-items-center rounded-md border border-line"
                  dangerouslySetInnerHTML={{ __html: v }}
                />
              ))}
            </div>
          </section>

          <section className="card">
            <EmptyState
              icon={<Folder size={36} />}
              title="Chưa có project nào"
              text="Tạo project đầu tiên hoặc nhập từ tệp JSON."
            >
              <Button variant="primary" size="lg" icon={<Plus />}>
                Tạo project đầu tiên
              </Button>
            </EmptyState>
          </section>
        </div>
      </div>
      <Dialog
        open={dlg}
        onClose={() => setDlg(false)}
        title="Hộp thoại mẫu"
        footer={
          <>
            <Button variant="outline" onClick={() => setDlg(false)}>
              Huỷ
            </Button>
            <Button variant="primary" onClick={() => setDlg(false)}>
              Lưu
            </Button>
          </>
        }
      >
        <Field label="Tên">
          <Input defaultValue="UMLab" />
        </Field>
      </Dialog>
    </div>
  );
}
