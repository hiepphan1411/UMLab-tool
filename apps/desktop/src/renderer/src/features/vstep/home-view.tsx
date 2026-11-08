import { ArrowRight, CalendarDays, Check, Clock, FolderOpen } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  B1_PLAN,
  PLAN_PHASES,
  PLAN_SKILL_LABEL,
  VSTEP_SKILLS,
  VSTEP_SKILL_LABEL,
  daysBetween,
  levelOf,
  localDateKey,
  planProgress,
  streak,
  type PlanDay,
  type PlanTask,
} from '@umlab/core';
import { cn } from '@/lib/cn';
import { Button, Dialog } from '@/ui';
import { Bar, Panel, fmtDate, linkPath, type Area } from './common';
import { DOCS, planFor } from './content';
import { HERO_STYLES, HeroBg, MiniCalendar, heroInk, resolveHero } from './hero';
import { docProgress, estimate, overall, practiceCount } from './progress';
import { useVstep } from './store';

export function TaskRow({ day, t }: { day: PlanDay; t: PlanTask }) {
  const nav = useNavigate();
  const done = useVstep((s) => !!s.state?.plan[day.date]?.[t.id]);
  const toggle = () =>
    useVstep.getState().update((s) => {
      s.plan[day.date] ??= {};
      s.plan[day.date][t.id] = !done;
    });
  const path = linkPath(t.link);
  return (
    <div className={cn('vs-task', done && 'done')} data-skill={t.skill}>
      <button
        className="vs-check"
        aria-label={done ? 'Bỏ đánh dấu' : 'Đánh dấu xong'}
        aria-pressed={done}
        onClick={toggle}
      >
        {done && <Check size={13} strokeWidth={3} />}
      </button>
      <span className="vs-task-skill">{PLAN_SKILL_LABEL[t.skill]}</span>
      <div className="vs-task-main">
        <div className="vs-task-title">{t.title}</div>
        {t.detail && <div className="vs-task-detail">{t.detail}</div>}
      </div>
      <span className="vs-task-min">{t.minutes}′</span>
      {path && (
        <button className="ibtn" aria-label="Mở" title="Mở bài học" onClick={() => nav(path)}>
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

/** Popup lịch học của một ngày (bấm vào ô trên lịch mini). */
function DayDialog({ date, days, onClose }: { date: string; days: PlanDay[]; onClose: () => void }) {
  const nav = useNavigate();
  const day = days.find((d) => d.date === date);
  const custom = useVstep((x) => x.state!.custom[date]);
  const note = useVstep((x) => x.state!.notes[date]);
  const done = useVstep((x) => x.state!.plan);
  const p = day ? planProgress([day], done) : null;
  const wd = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][
    new Date(date + 'T00:00:00').getDay()
  ];
  return (
    <Dialog
      open
      onClose={onClose}
      title={`${wd}, ${fmtDate(date)}${day?.phase === 0 ? ' — Ngày thi' : day?.phase ? ` — Giai đoạn ${day.phase}` : ''}`}
      width={620}
      footer={
        <>
          {p && p.total > 0 && (
            <span className="mr-auto text-muted">
              Đã xong {p.done}/{p.total} việc
            </span>
          )}
          <Button variant="outline" icon={<CalendarDays />} onClick={() => (onClose(), nav(`/vstep/plan?d=${date}`))}>
            Mở trong Lịch học
          </Button>
          <Button variant="primary" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
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
      {!!custom?.length && (
        <>
          <h4 className="vs-h4">Mục tiêu riêng</h4>
          <ul className="vs-ul">
            {custom.map((c) => (
              <li key={c.id} className={c.done ? 'text-muted line-through' : ''}>
                {c.title}
              </li>
            ))}
          </ul>
        </>
      )}
      {note && (
        <>
          <h4 className="vs-h4">Ghi chú</h4>
          <p style={{ whiteSpace: 'pre-wrap' }}>{note}</p>
        </>
      )}
    </Dialog>
  );
}

export function HomeView() {
  const nav = useNavigate();
  const [pick, setPick] = useState<string | null>(null);
  // nền "Theo giờ": vẽ lại mỗi 5 phút để đổi cảnh khi sang buổi mới
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5 * 60_000);
    return () => clearInterval(t);
  }, []);
  const s = useVstep((x) => x.state)!;
  const media = useVstep((x) => x.media);
  const days = useMemo(() => planFor(s), [s.startDate, s.examDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = localDateKey();
  const left = daysBetween(today, s.examDate);
  const todayPlan = days.find((d) => d.date === today);
  const prog = planProgress(days, s.plan);
  const est = estimate(s);
  const ov = overall(s);
  const st = streak(s.plan, today);
  const upcoming = !todayPlan ? days.find((d) => d.date > today) : null;
  const phase = todayPlan && todayPlan.phase ? PLAN_PHASES[todayPlan.phase - 1] : null;

  const set = (k: 'examDate' | 'startDate', v: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    useVstep.getState().update((x) => void (x[k] = v));
  };

  return (
    <div className="vs-page">
      <section className="vs-hero" data-ink={heroInk(s.heroStyle)}>
        <div className="vs-hero-bg">
          <HeroBg id={s.heroStyle} key={s.heroStyle === 'auto' ? resolveHero('auto') + tick : s.heroStyle} />
        </div>
        <div className="vs-hero-pick" role="radiogroup" aria-label="Kiểu nền">
          {HERO_STYLES.map((h) => (
            <button
              key={h.id}
              role="radio"
              aria-checked={s.heroStyle === h.id}
              className={'vs-hero-sw' + (s.heroStyle === h.id ? ' on' : '')}
              title={h.name}
              onClick={() => useVstep.getState().update((x) => void (x.heroStyle = h.id))}
            >
              <HeroBg id={h.id} />
              {h.id === 'auto' && <Clock className="vs-hero-sw-ic" size={12} />}
            </button>
          ))}
        </div>
        <div>
          <div className="vs-hero-label">Kỳ thi VSTEP - {fmtDate(s.examDate)}</div>
          <div className="vs-hero-big">
            {left > 0 ? `Còn ${left} ngày` : left === 0 ? 'Hôm nay thi!' : 'Đã qua ngày thi'}
          </div>
          <div className="vs-hero-sub">
            {phase
              ? `Giai đoạn ${phase.id}: ${phase.name}. ${phase.goal}.`
              : 'Mục tiêu: B1 (điểm trung bình ≥ 4,0), cố gắng 5,0 để có dư.'}
          </div>
        </div>
        <div className="vs-hero-stats">
          <div>
            <b>{prog.pct}%</b>
            <span>lịch học</span>
          </div>
          <div>
            <b>{st}</b>
            <span>ngày liên tiếp</span>
          </div>
          <div>
            <b>{ov == null ? '-' : ov.toFixed(1)}</b>
            <span>{ov == null ? 'chưa có điểm' : `ước tính ${levelOf(ov)}`}</span>
          </div>
        </div>
      </section>

      <div className="vs-grid-2">
        <Panel
          title={todayPlan ? `Hôm nay, ${fmtDate(today)}` : upcoming ? `Bắt đầu ${fmtDate(upcoming.date)}` : 'Lịch học'}
          actions={
            <Button size="sm" variant="outline" onClick={() => nav('/vstep/plan')}>
              Cả lịch
            </Button>
          }
        >
          {todayPlan || upcoming ? (
            <div className="vs-tasks">
              {(todayPlan ?? upcoming)!.tasks.map((t) => (
                <TaskRow key={t.id} day={(todayPlan ?? upcoming)!} t={t} />
              ))}
              <div className="vs-muted-line">Tổng khoảng {(todayPlan ?? upcoming)!.minutes} phút.</div>
            </div>
          ) : (
            <p className="text-muted">Lịch học đã kết thúc. Chỉnh ngày thi bên dưới để tạo lịch mới.</p>
          )}
        </Panel>

        <Panel
          title="Lịch tháng này"
          actions={
            <Button size="sm" variant="outline" onClick={() => nav('/vstep/plan')}>
              Mở lịch
            </Button>
          }
        >
          <MiniCalendar days={days} done={s.plan} onPick={setPick} />
          {pick && <DayDialog date={pick} days={days} onClose={() => setPick(null)} />}
        </Panel>
      </div>

      <div className="vs-grid-2">
        <Panel title="Điểm ước tính theo kỹ năng">
          <table className="vs-table">
            <thead>
              <tr>
                <th>Kỹ năng</th>
                <th>Ước tính</th>
                <th>Mục tiêu B1</th>
                <th>Đã luyện</th>
              </tr>
            </thead>
            <tbody>
              {VSTEP_SKILLS.map((k) => (
                <tr key={k} className="cursor-pointer" onClick={() => nav(`/vstep/${k}?tab=progress`)}>
                  <td>{VSTEP_SKILL_LABEL[k]}</td>
                  <td>
                    <b
                      className={cn(
                        est[k] != null && est[k]! >= B1_PLAN[k] ? 'text-ok' : est[k] != null ? 'text-warn' : '',
                      )}
                    >
                      {est[k] == null ? '-' : est[k]!.toFixed(1)}
                    </b>
                  </td>
                  <td>{B1_PLAN[k].toFixed(1)}</td>
                  <td>{practiceCount(s, k)} bài</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="vs-muted-line">
            Nghe/Đọc ước tính từ số câu đúng các bài gần nhất; Viết/Nói từ điểm bạn tự chấm. Điểm tổng = trung bình 4 kỹ
            năng, làm tròn 0,5.
          </p>
        </Panel>
      </div>

      <h2 className="vs-h2">Tài liệu</h2>
      <div className="vs-cards">
        {(['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocab'] as Area[]).map((a) => {
          const p = docProgress(s, a);
          return (
            <button key={a} className="vs-card" data-area={a} onClick={() => nav(`/vstep/${a}`)}>
              <div className="vs-card-title">{DOCS[a].title}</div>
              <div className="vs-card-sub">{DOCS[a].subtitle}</div>
              <Bar value={p.done} max={p.total} />
              <div className="vs-card-foot">
                {p.done}/{p.total} mục đã học
              </div>
            </button>
          );
        })}
      </div>

      <div className="vs-grid-2">
        <Panel title="Ngày thi và lịch">
          <div className="vs-form">
            <label>
              <span>Ngày thi</span>
              <input
                type="date"
                className="field"
                value={s.examDate}
                onChange={(e) => set('examDate', e.target.value)}
              />
            </label>
            <label>
              <span>Bắt đầu lịch từ</span>
              <input
                type="date"
                className="field"
                value={s.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </label>
          </div>
          <p className="vs-muted-line">
            Lịch tự chia {days.length - 1} ngày học thành 4 giai đoạn:{' '}
            {PLAN_PHASES.map((p) => p.name.toLowerCase()).join(' → ')}. Đổi ngày thì lịch xếp lại, việc đã đánh dấu vẫn
            giữ.
          </p>
        </Panel>
        <Panel title="Tài liệu âm thanh và sách">
          {media?.dir ? (
            <>
              <p className="vs-path">{media.dir}</p>
              <p className="vs-muted-line">
                {media.audio.length} tệp âm thanh, {media.bookPages} trang sách, {media.keyPages} trang lời thoại/đáp
                án.
              </p>
            </>
          ) : (
            <p className="text-muted">Chưa chọn thư mục chứa MP3 của sách “Ôn tổng hợp VSTEP bậc 3 (B1)”.</p>
          )}
          <Button
            size="sm"
            variant="outline"
            icon={<FolderOpen />}
            onClick={() => void useVstep.getState().pickMedia()}
          >
            {media?.dir ? 'Đổi thư mục' : 'Chọn thư mục'}
          </Button>
        </Panel>
      </div>
    </div>
  );
}
