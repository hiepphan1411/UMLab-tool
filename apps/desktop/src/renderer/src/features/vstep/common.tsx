import { Settings2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { localDateKey, type VstepSkill, type VstepState } from '@umlab/core';
import { cn } from '@/lib/cn';
import { openDialog, Button, Dialog, Segmented } from '@/ui';
import { planFor } from './content';
import { useSpeechPrefs, type Accent } from './speech';
import { useVstep } from './store';

export type Area = VstepSkill | 'grammar' | 'vocab';
export const AREA_LABEL: Record<Area, string> = {
  listening: 'Nghe',
  reading: 'Đọc',
  writing: 'Viết',
  speaking: 'Nói',
  grammar: 'Ngữ pháp',
  vocab: 'Từ vựng',
};

/** Đường dẫn trong app ứng với liên kết của việc trong lịch. */
export function linkPath(link?: string): string | null {
  if (!link) return null;
  const [kind, rest = ''] = link.split(':');
  switch (kind) {
    case 'doc': {
      const [d, s] = rest.split('#');
      return `/vstep/${d}?tab=doc${s ? `&s=${encodeURIComponent(s)}` : ''}`;
    }
    case 'track': {
      const n = Number(rest);
      return `/vstep/${n >= 65 ? 'speaking' : 'listening'}?tab=tracks&n=${n}`;
    }
    case 'set':
      return `/vstep/quiz/${encodeURIComponent(rest)}`;
    case 'write':
      return `/vstep/writing?tab=practice&task=${encodeURIComponent(rest)}`;
    case 'speak':
      return `/vstep/speaking?tab=practice&task=${encodeURIComponent(rest)}`;
    case 'book': {
      const [skill, sec] = rest.split('#');
      return `/vstep/${skill}?tab=book${sec ? `&sec=${encodeURIComponent(sec)}` : ''}`;
    }
    case 'cards':
      return '/vstep/vocab?tab=cards';
    case 'progress':
      return '/vstep?progress=1';
    default:
      return null;
  }
}

/** Đánh dấu xong mọi việc trong lịch có liên kết này (vd vừa làm xong bộ đề / học xong mục tài liệu). */
export function completeLink(s: VstepState, link: string, onDate?: string): void {
  for (const day of planFor(s)) {
    if (onDate && day.date !== onDate) continue;
    for (const t of day.tasks)
      if (t.link === link && !t.daily) {
        s.plan[day.date] ??= {};
        s.plan[day.date][t.id] = true;
      }
  }
}

/** Đánh dấu việc lặp hằng ngày của hôm nay (vd ôn thẻ từ vựng). */
export function completeDaily(s: VstepState, dailyId: string): void {
  const d = localDateKey();
  s.plan[d] ??= {};
  s.plan[d][`${dailyId}@${d}`] = true;
}

export function fmtDate(d: string): string {
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

export const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const weekday = (d: string) => WEEKDAY[new Date(d + 'T00:00:00').getDay()];

export function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Đồng hồ đếm (giây đã trôi) – dừng khi `running` = false. */
export function useElapsed(running: boolean): [number, () => void] {
  const [sec, setSec] = useState(0);
  const start = useRef(Date.now());
  const base = useRef(0);
  useEffect(() => {
    if (!running) {
      base.current = sec;
      return;
    }
    start.current = Date.now();
    const t = setInterval(() => setSec(base.current + (Date.now() - start.current) / 1000), 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const reset = () => {
    base.current = 0;
    start.current = Date.now();
    setSec(0);
  };
  return [sec, reset];
}

export function Bar({ value, max = 100, tone }: { value: number; max?: number; tone?: 'ok' | 'warn' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="vs-bar" data-tone={tone}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('vs-panel', className)}>
      {(title || actions) && (
        <header>
          {title && <h3>{title}</h3>}
          <div className="ml-auto flex items-center gap-1.5">{actions}</div>
        </header>
      )}
      {children}
    </section>
  );
}

function SpeechDialog({ done }: { done: () => void }) {
  const p = useSpeechPrefs();
  return (
    <Dialog
      open
      onClose={done}
      title="Phát âm và hiển thị"
      width={420}
      footer={
        <Button variant="primary" onClick={done}>
          Xong
        </Button>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <span className="text-muted">Giọng đọc</span>
          <Segmented<Accent>
            value={p.accent}
            onChange={(accent) => p.set({ accent })}
            options={[
              { value: 'en-GB', label: 'Anh – Anh' },
              { value: 'en-US', label: 'Anh – Mỹ' },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-muted">Tốc độ đọc</span>
          <Segmented<number>
            value={p.rate}
            onChange={(rate) => p.set({ rate })}
            options={[0.7, 0.8, 0.9, 1, 1.15].map((r) => ({ value: r, label: `${r}×` }))}
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-muted">Trong tài liệu</span>
          <label className="chk">
            <input type="checkbox" checked={p.showIpa} onChange={(e) => p.set({ showIpa: e.target.checked })} />
            Hiện phiên âm IPA
          </label>
          <label className="chk">
            <input type="checkbox" checked={p.showMeaning} onChange={(e) => p.set({ showMeaning: e.target.checked })} />
            Hiện nghĩa tiếng Việt cạnh từ in đậm
          </label>
          <label className="chk">
            <input type="checkbox" checked={p.sentenceIpa} onChange={(e) => p.set({ sentenceIpa: e.target.checked })} />
            Hiện IPA cả câu dưới mẫu câu, template, bài mẫu (để luyện nói)
          </label>
        </div>
        <p className="text-muted">
          Giọng đọc dùng giọng tiếng Anh có sẵn của Windows. Nếu chỉ có một giọng, cài thêm trong Cài đặt Windows → Thời
          gian và ngôn ngữ → Giọng nói.
        </p>
      </div>
    </Dialog>
  );
}

export function SpeechButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      icon={<Settings2 />}
      onClick={() => void openDialog<null>((done) => <SpeechDialog done={() => done(null)} />)}
    >
      Phát âm
    </Button>
  );
}

export function SaveBadge() {
  const save = useVstep((s) => s.save);
  const text = { idle: '', saving: 'Đang lưu…', saved: 'Đã lưu', local: 'Đã lưu trên máy', error: 'Lỗi lưu' }[save];
  return text ? <span className={cn('vs-save', save === 'error' && 'text-danger')}>{text}</span> : null;
}
