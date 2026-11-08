import { Play, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  B1_PLAN,
  VSTEP_SKILL_LABEL,
  bandFromRaw,
  importedSets,
  questionCount,
  type VstepSet,
  type VstepSkill,
  type VstepState,
} from '@umlab/core';
import { Button, EmptyState, IconButton, Tabs, confirmDialog } from '@/ui';
import { AREA_LABEL, Bar, Panel, fmtDate, mmss, type Area } from './common';
import { BUILTIN_SETS } from './content';
import { BookView, TracksView } from './book-view';
import { CardsView } from './cards-view';
import { ProgressRows, ScoreBars } from './charts';
import { TRACK_GROUPS } from './content/tracks';
import { DocView } from './doc-view';
import { docProgress, estimate } from './progress';
import { SpeakingLab } from './speaking-lab';
import { useVstep } from './store';
import { WritingLab } from './writing-lab';

type Tab = 'doc' | 'practice' | 'tracks' | 'book' | 'progress' | 'cards';

const TABS: Record<Area, { value: Tab; label: string }[]> = {
  listening: [
    { value: 'doc', label: 'Tài liệu' },
    { value: 'tracks', label: 'Luyện với sách (64 track)' },
    { value: 'book', label: 'Lý thuyết sách' },
    { value: 'practice', label: 'Làm đề' },
    { value: 'progress', label: 'Tiến độ' },
  ],
  reading: [
    { value: 'doc', label: 'Tài liệu' },
    { value: 'book', label: 'Sách (lý thuyết + bài tập)' },
    { value: 'practice', label: 'Làm đề' },
    { value: 'progress', label: 'Tiến độ' },
  ],
  writing: [
    { value: 'doc', label: 'Tài liệu & template' },
    { value: 'practice', label: 'Luyện viết' },
    { value: 'book', label: 'Sách' },
    { value: 'progress', label: 'Tiến độ' },
  ],
  speaking: [
    { value: 'doc', label: 'Tài liệu & template' },
    { value: 'practice', label: 'Luyện nói' },
    { value: 'tracks', label: 'Track sách (65–89)' },
    { value: 'book', label: 'Sách' },
    { value: 'progress', label: 'Tiến độ' },
  ],
  grammar: [{ value: 'doc', label: 'Tài liệu' }],
  vocab: [
    { value: 'doc', label: 'Bảng từ theo chủ đề' },
    { value: 'cards', label: 'Thẻ ghi nhớ' },
  ],
};

export function allSets(s: VstepState): VstepSet[] {
  return [...BUILTIN_SETS, ...importedSets(s)];
}

const setSkills = (x: VstepSet): VstepSkill[] => {
  const out = new Set<VstepSkill>();
  if (x.skill !== 'mixed') out.add(x.skill);
  else {
    if (x.sections.some((sec) => sec.audio || sec.tts)) out.add('listening');
    if (x.sections.some((sec) => !sec.audio && !sec.tts)) out.add('reading');
  }
  if (x.writing.length) out.add('writing');
  if (x.speaking.length) out.add('speaking');
  return [...out];
};

export function SetList({ skill }: { skill: 'listening' | 'reading' }) {
  const nav = useNavigate();
  const s = useVstep((x) => x.state)!;
  const sets = allSets(s).filter((x) => x.sections.length && setSkills(x).includes(skill));
  if (!sets.length) return <EmptyState title="Chưa có đề" text="Nhập đề JSON ở mục Kho đề để luyện thêm." />;
  return (
    <div className="vs-list">
      {sets.map((x) => {
        const att = s.attempts.filter((a) => a.setId === x.id);
        const best = att.reduce((m, a) => Math.max(m, a.correct), -1);
        const imported = !x.id.startsWith('builtin-');
        return (
          <div key={x.id} className="vs-row">
            <div className="vs-row-main">
              <div className="vs-row-title">{x.title}</div>
              <div className="vs-row-sub">
                {questionCount(x)} câu{x.minutes ? `, ${x.minutes} phút` : ''}
                {x.description ? ` - ${x.description}` : ''}
              </div>
            </div>
            {best >= 0 && (
              <span className="vs-row-score">
                Tốt nhất {best}/{questionCount(x)} ({bandFromRaw(best, questionCount(x)).toFixed(1)})
              </span>
            )}
            {imported && (
              <IconButton
                label="Xoá bộ đề đã nhập"
                size="sm"
                onClick={async () => {
                  if (
                    await confirmDialog({
                      title: 'Xoá bộ đề?',
                      text: `Xoá “${x.title}” khỏi kho đề. Lịch sử làm bài vẫn giữ.`,
                      danger: true,
                      confirmLabel: 'Xoá',
                    })
                  )
                    useVstep
                      .getState()
                      .update((st) => void (st.sets = st.sets.filter((y) => (y as { id?: string }).id !== x.id)));
                }}
              >
                <Trash2 size={14} />
              </IconButton>
            )}
            <Button
              size="sm"
              variant="primary"
              icon={<Play />}
              onClick={() => nav(`/vstep/quiz/${encodeURIComponent(x.id)}`)}
            >
              Làm bài
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function ProgressTab({ area }: { area: VstepSkill }) {
  const s = useVstep((x) => x.state)!;
  const nav = useNavigate();
  const est = estimate(s)[area];
  const dp = docProgress(s, area);
  const attempts = s.attempts
    .filter((a) => a.skill === area)
    .slice()
    .reverse();
  const tracks = Object.entries(s.tracks).filter(([n, t]) => (area === 'listening' ? +n < 65 : +n >= 65) && t.done);
  return (
    <div className="vs-page">
      <div className="vs-stats">
        <div className="vs-stat">
          <span>Điểm ước tính</span>
          <b>{est == null ? '-' : est.toFixed(1)}</b>
          <small>Mục tiêu B1: {B1_PLAN[area].toFixed(1)}</small>
        </div>
        <div className="vs-stat">
          <span>Tài liệu đã học</span>
          <b>
            {dp.done}/{dp.total}
          </b>
          <Bar value={dp.done} max={dp.total} />
        </div>
        {(area === 'listening' || area === 'speaking') && (
          <div className="vs-stat">
            <span>Track sách đã luyện</span>
            <b>
              {tracks.length}/{area === 'listening' ? 64 : 25}
            </b>
            <Bar value={tracks.length} max={area === 'listening' ? 64 : 25} />
          </div>
        )}
        <div className="vs-stat">
          <span>Số bài đã làm</span>
          <b>{area === 'writing' ? s.writings.length : area === 'speaking' ? s.speaking.length : attempts.length}</b>
        </div>
      </div>

      <div className="vs-grid-2">
        <Panel
          title={
            area === 'writing' || area === 'speaking' ? 'Điểm tự chấm các lần gần đây' : 'Điểm các lần làm đề (0–10)'
          }
        >
          <ScoreBars
            target={B1_PLAN[area]}
            data={(area === 'writing' ? s.writings : area === 'speaking' ? s.speaking : [])
              .filter((w) => w.self != null)
              .slice(-20)
              .map((w) => ({
                label: new Date(w.at).toLocaleDateString('vi-VN').slice(0, 5),
                value: w.self!,
                tip: `${new Date(w.at).toLocaleDateString('vi-VN')}: ${w.self!.toFixed(1)}`,
              }))
              .concat(
                (area === 'listening' || area === 'reading' ? attempts.slice().reverse() : []).slice(-20).map((a) => ({
                  label: new Date(a.at).toLocaleDateString('vi-VN').slice(0, 5),
                  value: bandFromRaw(a.correct, a.total),
                  tip: `${a.setTitle}: ${a.correct}/${a.total} (${bandFromRaw(a.correct, a.total).toFixed(1)})`,
                })),
              )}
          />
        </Panel>
        <Panel title={area === 'listening' || area === 'speaking' ? 'Track sách theo nhóm' : 'Tài liệu đã học'}>
          {area === 'listening' || area === 'speaking' ? (
            <ProgressRows
              rows={TRACK_GROUPS.filter((g) => g.skill === area).map((g) => ({
                label: g.code,
                done: Object.entries(s.tracks).filter(([n, t]) => +n >= g.from && +n <= g.to && t.done).length,
                total: g.to - g.from + 1,
              }))}
            />
          ) : (
            <ProgressRows rows={[{ label: 'Mục tài liệu', done: dp.done, total: dp.total }]} />
          )}
        </Panel>
      </div>

      {(area === 'listening' || area === 'reading') && (
        <Panel title="Lịch sử làm đề">
          {attempts.length ? (
            <table className="vs-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Bộ đề</th>
                  <th>Đúng</th>
                  <th>Điểm</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => nav(`/vstep/quiz/${encodeURIComponent(a.setId)}?review=${a.id}`)}
                  >
                    <td>{new Date(a.at).toLocaleString('vi-VN')}</td>
                    <td>{a.setTitle}</td>
                    <td>
                      {a.correct}/{a.total}
                    </td>
                    <td>
                      <b>{bandFromRaw(a.correct, a.total).toFixed(1)}</b>
                    </td>
                    <td>{mmss(a.durationSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">Chưa làm đề nào. Bấm vào một dòng sau khi làm để xem lại câu sai.</p>
          )}
        </Panel>
      )}

      {area === 'listening' && tracks.length > 0 && (
        <Panel title="Track đã tự chấm">
          <div className="vs-chips">
            {tracks
              .sort((a, b) => +a[0] - +b[0])
              .map(([n, t]) => (
                <button key={n} className="vs-chip" onClick={() => nav(`/vstep/listening?tab=tracks&n=${n}`)}>
                  {n}
                  {t.total ? `: ${t.correct}/${t.total}` : ''}
                </button>
              ))}
          </div>
        </Panel>
      )}

      {area === 'writing' && (
        <Panel title="Bài đã viết">
          {s.writings.length ? (
            <table className="vs-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Đề</th>
                  <th>Số từ</th>
                  <th>Tự chấm</th>
                </tr>
              </thead>
              <tbody>
                {s.writings
                  .slice()
                  .reverse()
                  .map((w) => (
                    <tr
                      key={w.id}
                      className="cursor-pointer"
                      onClick={() => nav(`/vstep/writing?tab=practice&task=${encodeURIComponent(w.taskId)}`)}
                    >
                      <td>{fmtDate(new Date(w.at).toISOString().slice(0, 10))}</td>
                      <td>
                        Task {w.task}: {w.title}
                      </td>
                      <td>{w.words}</td>
                      <td>{w.self == null ? '-' : w.self.toFixed(1)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">Chưa có bài viết nào.</p>
          )}
        </Panel>
      )}

      {area === 'speaking' && (
        <Panel title="Các lần luyện nói">
          {s.speaking.length ? (
            <table className="vs-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Đề</th>
                  <th>Thời lượng</th>
                  <th>Tự chấm</th>
                </tr>
              </thead>
              <tbody>
                {s.speaking
                  .slice()
                  .reverse()
                  .map((w) => (
                    <tr key={w.id}>
                      <td>{new Date(w.at).toLocaleString('vi-VN')}</td>
                      <td>
                        Part {w.part}: {w.topic}
                      </td>
                      <td>{mmss(w.durationSec)}</td>
                      <td>{w.self == null ? '-' : w.self.toFixed(1)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">Chưa luyện lần nào.</p>
          )}
        </Panel>
      )}
    </div>
  );
}

export function SkillView({ area }: { area: Area }) {
  const [sp, setSp] = useSearchParams();
  const tabs = TABS[area];
  const tab = (tabs.find((t) => t.value === sp.get('tab'))?.value ?? 'doc') as Tab;
  const setTab = (t: Tab) => setSp({ tab: t }, { replace: false });
  const content = useMemo(() => {
    switch (tab) {
      case 'doc':
        return (
          <DocView id={area} section={sp.get('s')} onSection={(s) => setSp({ tab: 'doc', s }, { replace: true })} />
        );
      case 'tracks':
        return <TracksView skill={area === 'speaking' ? 'speaking' : 'listening'} />;
      case 'book':
        return <BookView skill={area as 'listening' | 'reading' | 'writing' | 'speaking'} />;
      case 'cards':
        return <CardsView />;
      case 'progress':
        return <ProgressTab area={area as VstepSkill} />;
      case 'practice':
        if (area === 'writing') return <WritingLab />;
        if (area === 'speaking') return <SpeakingLab />;
        return (
          <div className="vs-page">
            <SetList skill={area as 'listening' | 'reading'} />
          </div>
        );
    }
  }, [tab, area, sp, setSp]);

  return (
    <div className="vs-skill">
      <div className="vs-skill-head">
        <h1>{area in VSTEP_SKILL_LABEL ? `Kỹ năng ${AREA_LABEL[area].toLowerCase()}` : AREA_LABEL[area]}</h1>
        {tabs.length > 1 && <Tabs<Tab> value={tab} onChange={setTab} items={tabs} className="vs-tabs" />}
      </div>
      <div className="vs-skill-body">{content}</div>
    </div>
  );
}
