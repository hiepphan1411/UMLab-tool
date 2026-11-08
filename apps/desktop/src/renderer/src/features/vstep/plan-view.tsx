import { ArrowRight, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PLAN_PHASES, addDays, localDateKey, planProgress, streak, type PlanDay } from '@umlab/core';
import { cn } from '@/lib/cn';
import { Button, IconButton } from '@/ui';
import { Bar, Panel, WEEKDAY, fmtDate, weekday } from './common';
import { planFor } from './content';
import { TaskRow } from './home-view';
import { uid, useVstep } from './store';

const PHASE_COLOR: Record<number, string> = { 1: '#2E62E6', 2: '#1F9D66', 3: '#D98A1C', 4: '#D9463E' };

/** Ghi chú gõ vào state cục bộ, lưu sau 500 ms (không ghi cả trạng thái mỗi phím gõ). */
function NoteBox({ date }: { date: string }) {
  const saved = useVstep((x) => x.state!.notes[date] ?? '');
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [date]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (text === saved) return;
    const t = setTimeout(() => useVstep.getState().update((x) => void (x.notes[date] = text)), 500);
    return () => clearTimeout(t);
  }, [text, saved, date]);
  return (
    <textarea
      className="field vs-note"
      placeholder="Hôm nay học được gì, câu nào hay sai…"
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  );
}

const MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

function monthGrid(y: number, m: number): string[] {
  const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const dow = (new Date(first + 'T00:00:00').getDay() + 6) % 7; // thứ Hai đầu tuần
  const start = addDays(first, -dow);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function DayPanel({ day, date }: { day: PlanDay | undefined; date: string }) {
  const s = useVstep((x) => x.state)!;
  const [text, setText] = useState('');
  const custom = s.custom[date] ?? [];
  const update = useVstep.getState().update;
  const add = () => {
    const t = text.trim();
    if (!t) return;
    update((x) => void (x.custom[date] = [...(x.custom[date] ?? []), { id: uid(), title: t, done: false }]));
    setText('');
  };
  return (
    <Panel
      title={`${weekday(date)}, ${fmtDate(date)}${day?.phase ? ` - Giai đoạn ${day.phase}` : day?.phase === 0 ? ' - Ngày thi' : ''}`}
    >
      {day ? (
        <div className="vs-tasks">
          {day.tasks.map((t) => (
            <TaskRow key={t.id} day={day} t={t} />
          ))}
        </div>
      ) : (
        <p className="text-muted">Ngày này không nằm trong lịch học.</p>
      )}
      <h4 className="vs-h4">Mục tiêu riêng</h4>
      <div className="vs-tasks">
        {custom.map((c) => (
          <div key={c.id} className={cn('vs-task', c.done && 'done')}>
            <button
              className="vs-check"
              aria-pressed={c.done}
              aria-label="Đánh dấu"
              onClick={() =>
                update(
                  (x) =>
                    void (x.custom[date] = (x.custom[date] ?? []).map((y) =>
                      y.id === c.id ? { ...y, done: !y.done } : y,
                    )),
                )
              }
            />
            <div className="vs-task-main">
              <div className="vs-task-title">{c.title}</div>
            </div>
            <IconButton
              label="Xoá"
              size="sm"
              onClick={() => update((x) => void (x.custom[date] = (x.custom[date] ?? []).filter((y) => y.id !== c.id)))}
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            className="field"
            placeholder="Thêm mục tiêu cho ngày này…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit" size="sm" icon={<Plus />}>
            Thêm
          </Button>
        </form>
      </div>
      <h4 className="vs-h4">Ghi chú</h4>
      <NoteBox date={date} />
    </Panel>
  );
}

export function PlanView() {
  const s = useVstep((x) => x.state)!;
  const days = useMemo(() => planFor(s), [s.startDate, s.examDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const today = localDateKey();
  const [sp] = useSearchParams();
  const want = sp.get('d');
  const [sel, setSel] = useState(
    want && /^\d{4}-\d{2}-\d{2}$/.test(want) ? want : byDate.has(today) ? today : (days[0]?.date ?? today),
  );
  const [ym, setYm] = useState(() => ({ y: +sel.slice(0, 4), m: +sel.slice(5, 7) - 1 }));
  const grid = monthGrid(ym.y, ym.m);
  const prog = planProgress(days, s.plan);
  const move = (k: number) =>
    setYm(({ y, m }) => ({ y: m + k < 0 ? y - 1 : m + k > 11 ? y + 1 : y, m: (m + k + 12) % 12 }));

  return (
    <div className="vs-page">
      <div className="vs-page-head">
        <h1>Lịch học</h1>
        <span className="text-muted">
          {fmtDate(s.startDate)} → {fmtDate(s.examDate)}, đã xong {prog.done}/{prog.total} việc, chuỗi{' '}
          {streak(s.plan, today)} ngày
        </span>
      </div>
      <Bar value={prog.done} max={prog.total} tone="ok" />
      <div className="vs-phases">
        {PLAN_PHASES.map((p) => {
          const ds = days.filter((d) => d.phase === p.id);
          const pp = planProgress(ds, s.plan);
          return (
            <Fragment key={p.id}>
              {p.id > 1 && <ArrowRight size={18} className="vs-phase-arrow" aria-hidden />}
              <div className="vs-phase">
                <b>
                  <span className="vs-phase-dot" style={{ background: PHASE_COLOR[p.id] }} />
                  Giai đoạn {p.id}: {p.name}
                </b>
                <span>
                  {ds.length ? `${fmtDate(ds[0].date)} – ${fmtDate(ds[ds.length - 1].date)}` : 'Không có ngày'}, xong{' '}
                  {pp.pct}%
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className="vs-cal-wrap">
        <Panel
          className="vs-cal-panel"
          title={`${MONTHS[ym.m]} ${ym.y}`}
          actions={
            <>
              <IconButton label="Tháng trước" size="sm" onClick={() => move(-1)}>
                <ChevronLeft size={15} />
              </IconButton>
              <Button
                size="sm"
                variant="outline"
                onClick={() => (setSel(today), setYm({ y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 }))}
              >
                Hôm nay
              </Button>
              <IconButton label="Tháng sau" size="sm" onClick={() => move(1)}>
                <ChevronRight size={15} />
              </IconButton>
            </>
          }
        >
          <div className="vs-cal">
            {[1, 2, 3, 4, 5, 6, 0].map((w) => (
              <div key={w} className="vs-cal-h">
                {WEEKDAY[w]}
              </div>
            ))}
            {grid.map((d) => {
              const day = byDate.get(d);
              const p = day ? planProgress([day], s.plan) : null;
              const custom = s.custom[d]?.length ?? 0;
              return (
                <button
                  key={d}
                  className={cn(
                    'vs-cal-d',
                    +d.slice(5, 7) - 1 !== ym.m && 'out',
                    d === today && 'today',
                    d === sel && 'sel',
                    day && 'in',
                  )}
                  data-phase={day?.phase}
                  onClick={() => setSel(d)}
                >
                  <span className="vs-cal-n">{+d.slice(8)}</span>
                  {day?.phase === 0 ? (
                    <span className="vs-cal-exam">Thi</span>
                  ) : p ? (
                    <>
                      <span className="vs-cal-p">
                        {p.done}/{p.total}
                      </span>
                      <span className="vs-cal-bar">
                        <i style={{ width: `${p.pct}%` }} />
                      </span>
                    </>
                  ) : null}
                  {(custom > 0 || s.notes[d]) && <span className="vs-cal-dot" />}
                </button>
              );
            })}
          </div>
        </Panel>
        <DayPanel day={byDate.get(sel)} date={sel} />
      </div>
    </div>
  );
}
