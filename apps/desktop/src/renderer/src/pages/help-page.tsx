// Trang Giới thiệu / Trợ giúp (docs/phases/P13-polish-deploy.md mục 9): phím tắt, ký hiệu từng loại sơ đồ (sinh từ
// registry của engine), định dạng JSON, giới thiệu & cách hoạt động local-first.
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIAGRAM_TYPE_INFO } from '@umlab/core';
import type { AppInfo } from '@shared/api';
import jsonFormat from '@fixtures/../spec/json-format.md?raw';
import { umlab } from '@/lib/api';
import { DiagramIcon } from '@/lib/icons';
import { cn } from '@/lib/cn';
import { Button, Kbd, Logo, Segmented } from '@/ui';
import { getConnector, getPalette, getShape, type PaletteItem } from '@/features/editors/engine/registry';
import { UmlIcon } from '@/features/editors/engine/palette';
import { ensureEditor } from '@/features/editors/register-all';
import { Spacer, TopBar } from '@/features/shell/top-bar';
import { ThemeButton } from '@/features/shell/theme-button';

export const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: 'Chung',
    items: [
      ['Ctrl + K', 'Tìm trong cả project (sơ đồ, phần tử, bước đặc tả)'],
      ['F1', 'Mở trang trợ giúp này'],
      ['Ctrl + Z / Ctrl + Y', 'Hoàn tác / làm lại (chỉ thao tác của chính bạn)'],
      ['F2', 'Đổi tên mục đang chọn trong cây thư mục'],
    ],
  },
  {
    group: 'Canvas',
    items: [
      ['V / H', 'Công cụ chọn / kéo khung nhìn'],
      ['Space + kéo', 'Di chuyển khung nhìn'],
      ['Ctrl + cuộn', 'Thu phóng'],
      ['Shift + 1', 'Vừa màn hình'],
      ['Ctrl + D', 'Nhân bản'],
      ['Ctrl + C / Ctrl + V', 'Sao chép / dán (cả giữa các sơ đồ)'],
      ['Ctrl + G', 'Nhóm (Element Group)'],
      ['Ctrl + F', 'Tìm hình trong sơ đồ'],
      ['Delete', 'Xoá khỏi sơ đồ'],
      ['Ctrl + Delete', 'Xoá khỏi mô hình (mọi sơ đồ)'],
      ['Alt (giữ khi kéo)', 'Tắt bắt dính tạm thời'],
      ['Nhấp đúp lên hình', 'Sửa chữ tại chỗ'],
      ['Nhấp đúp lên đường nối', 'Bẻ khúc vuông góc tại chỗ bấm'],
      ['Nhấp đúp lên công cụ', 'Giữ công cụ (vẽ nhiều lần)'],
    ],
  },
  {
    group: 'Theo loại sơ đồ',
    items: [
      ['Alt + Shift + A / O', 'Class: thêm thuộc tính / phương thức'],
      ['Alt + Shift + C', 'ERD: thêm cột'],
      ['Gõ “:” trong thuộc tính', 'Class: gợi ý kiểu'],
      ['Kéo message lên / xuống', 'Sequence: đổi thứ tự (đánh số lại)'],
      ['Shift + kéo message', 'Sequence: chèn khoảng trống'],
      ['Enter / Shift + Enter', 'Đặc tả: thêm bước / xuống dòng trong bước'],
      ['Backspace ở dòng rỗng', 'Đặc tả: xoá bước'],
    ],
  },
];

/** F1 mở trang trợ giúp. */
export function useHelpShortcut() {
  const nav = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        nav('/help');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);
}

/** Markdown tối giản (tiêu đề, khối mã, danh sách, đoạn, `code`). */
function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  const inline = (s: string) =>
    s
      .split(/(`[^`]+`)/g)
      .map((p, i) => (p.startsWith('`') && p.endsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p));
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('```')) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      blocks.push(<pre key={i}>{code.join('\n')}</pre>);
    } else if (/^#{1,4} /.test(l)) {
      const n = l.indexOf(' ');
      const H = (['h2', 'h2', 'h3', 'h4'] as const)[n - 1];
      blocks.push(<H key={i}>{inline(l.slice(n + 1))}</H>);
    } else if (/^\s*[-*] /.test(l)) {
      const items: string[] = [];
      for (; i < lines.length && /^\s*[-*] /.test(lines[i]); i++) items.push(lines[i].replace(/^\s*[-*] /, ''));
      i--;
      blocks.push(
        <ul key={i}>
          {items.map((t, k) => (
            <li key={k}>{inline(t)}</li>
          ))}
        </ul>,
      );
    } else if (l.startsWith('|')) {
      const rows: string[] = [];
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i]);
      i--;
      blocks.push(<pre key={i}>{rows.join('\n')}</pre>);
    } else if (l.trim()) blocks.push(<p key={i}>{inline(l)}</p>);
  }
  return <div className="help-md">{blocks}</div>;
}

function Notation() {
  const types = DIAGRAM_TYPE_INFO.filter((t) => t.canvas);
  const [type, setType] = useState(types[0]?.type ?? 'usecase');
  const [ready, setReady] = useState(0);
  useEffect(() => {
    let alive = true;
    void ensureEditor(type).then(() => alive && setReady((x) => x + 1));
    return () => {
      alive = false;
    };
  }, [type]);
  const groups = useMemo(() => getPalette(type), [type, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const row = (it: PaletteItem) => {
    const def = getShape(it.id);
    const con = def ? undefined : getConnector(it.id);
    const label = it.label ?? def?.label ?? con?.label ?? it.id;
    return (
      <li key={it.id} className="flex items-center gap-2">
        <UmlIcon name={it.icon ?? def?.icon ?? con?.icon ?? 'missing'} size={16} />
        <span>{label}</span>
        <span className="text-[11px] text-muted">{con ? 'đường nối' : def?.modelKind ? 'phần tử mô hình' : ''}</span>
      </li>
    );
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Loại sơ đồ">
        {types.map((t) => (
          <button
            key={t.type}
            type="button"
            role="tab"
            aria-selected={type === t.type}
            className={cn('chip', type === t.type && 'on')}
            onClick={() => setType(t.type)}
          >
            <DiagramIcon type={t.type} size={14} colored />
            {t.label}
          </button>
        ))}
      </div>
      {!groups.length && <p className="text-muted">Đang nạp…</p>}
      <div className="help-notation">
        {groups.map((g, gi) => (
          <section key={g.id + gi}>
            {g.label && <h4>{g.label}</h4>}
            <ul className="grid gap-1">{g.items.flatMap((it) => (it.variants ? it.variants : [it])).map(row)}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function HelpPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<'keys' | 'notation' | 'json' | 'about'>('keys');
  const [info, setInfo] = useState<AppInfo | null>(null);
  useEffect(() => {
    if (umlab)
      void umlab.app
        .info()
        .then(setInfo)
        .catch(() => {});
  }, []);
  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <Button variant="outline" icon={<ArrowLeft />} onClick={() => nav(-1)}>
          Quay lại
        </Button>
        <h1 className="text-[15px] font-semibold">Trợ giúp</h1>
        <Spacer />
        <ThemeButton />
      </TopBar>
      <main className="scroll min-h-0 flex-1 p-6" aria-label="Trợ giúp">
        <div className="mx-auto grid max-w-[920px] gap-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'keys', label: 'Phím tắt' },
              { value: 'notation', label: 'Ký hiệu' },
              { value: 'json', label: 'Định dạng JSON' },
              { value: 'about', label: 'Giới thiệu' },
            ]}
          />
          {tab === 'keys' && (
            <div className="grid gap-4 md:grid-cols-2">
              {SHORTCUTS.map((g) => (
                <section key={g.group} className="card p-4">
                  <h3 className="mb-2 font-semibold">{g.group}</h3>
                  <dl className="grid gap-1.5">
                    {g.items.map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-3">
                        <dt>
                          <Kbd>{k}</Kbd>
                        </dt>
                        <dd className="text-right text-muted">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          )}
          {tab === 'notation' && <Notation />}
          {tab === 'json' && <Markdown text={jsonFormat} />}
          {tab === 'about' && (
            <section className="card grid gap-3 p-5">
              <Logo height={30} />
              <p>
                UMLab là ứng dụng desktop vẽ sơ đồ UML, kiến trúc, ERD và Gantt theo project, cộng tác thời gian thực
                không cần máy chủ riêng: mỗi máy kết nối thẳng MongoDB; dữ liệu project là tài liệu CRDT (Yjs) đồng bộ
                qua change stream.
              </p>
              <p>
                <b>Lưu trên máy trước (local-first):</b> mỗi project có một tệp <code>.umlab</code> trong thư mục bạn
                chọn; mọi thay đổi ghi vào tệp trước rồi tự đồng bộ lên MongoDB. Mất mạng vẫn mở / sửa / tạo project, có
                mạng lại sẽ tự đồng bộ. Biểu tượng wifi: xanh = tốt, vàng = chậm / đang đồng bộ, đỏ = mất kết nối.
              </p>
              <p>
                <b>Lịch sử phiên bản:</b> mỗi sơ đồ tự lưu một phiên bản khi có thay đổi (cách nhau ít nhất 5 phút, giữ
                50 bản) — xem và khôi phục ở nút <i>Lịch sử phiên bản</i> trên thanh trên của editor.
              </p>
              {info && (
                <p className="text-muted">
                  Phiên bản {info.version} · Electron {info.electron} · {info.platform}
                </p>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
