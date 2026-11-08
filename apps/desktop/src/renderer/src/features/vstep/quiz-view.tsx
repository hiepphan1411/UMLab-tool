import { ArrowLeft, Pause, Play, RotateCcw, Send, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  VSTEP_MINUTES,
  bandFromRaw,
  levelOf,
  questionCount,
  type VstepAttempt,
  type VstepSection,
  type VstepSet,
} from '@umlab/core';
import { cn } from '@/lib/cn';
import { Button, EmptyState, Segmented, confirmDialog } from '@/ui';
import { Panel, completeLink, mmss, useElapsed } from './common';
import { Rich, mdHtml } from './rich';
import { allSets } from './skill-view';
import { speakScript, stopSpeaking } from './speech';
import { findAudio, mediaUrl, uid, useVstep } from './store';

const LETTERS = 'ABCDEF';

function SectionAudio({ sec, examMode, locked }: { sec: VstepSection; examMode: boolean; locked: boolean }) {
  const media = useVstep((s) => s.media);
  const [plays, setPlays] = useState(0);
  const [on, setOn] = useState(false);
  const cancel = useRef(false);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(
    () => () => {
      cancel.current = true;
      stopSpeaking();
    },
    [],
  );
  const used = examMode && plays >= 1 && !locked;
  if (sec.audio) {
    const rel = findAudio(media, sec.audio);
    if (!rel)
      return (
        <p className="text-warn">Không tìm thấy tệp “{sec.audio}” trong thư mục tài liệu (Tổng quan → Chọn thư mục).</p>
      );
    return (
      <audio
        ref={audio}
        className="vs-audio"
        src={mediaUrl(rel)}
        controls={!examMode || locked}
        onPlay={() => setPlays((p) => p + 1)}
        onEnded={() => setOn(false)}
      >
        <track kind="captions" />
      </audio>
    );
  }
  if (!sec.tts) return null;
  const run = async () => {
    if (on) {
      cancel.current = true;
      stopSpeaking();
      setOn(false);
      return;
    }
    cancel.current = false;
    setOn(true);
    setPlays((p) => p + 1);
    await speakScript(sec.tts!, () => cancel.current);
    setOn(false);
  };
  return (
    <div className="vs-tts">
      <Button
        size="sm"
        variant={on ? 'outline' : 'primary'}
        icon={on ? <Square /> : <Play />}
        disabled={used && !on}
        onClick={() => void run()}
      >
        {on ? 'Dừng' : used ? 'Đã nghe (chế độ thi chỉ 1 lần)' : plays ? 'Nghe lại' : 'Nghe đoạn này'}
      </Button>
    </div>
  );
}

function ExamAudio({ sec }: { sec: VstepSection }) {
  // chế độ thi + tệp âm thanh: một nút phát duy nhất, không tua
  const media = useVstep((s) => s.media);
  const ref = useRef<HTMLAudioElement>(null);
  const [st, setSt] = useState<'idle' | 'playing' | 'ended'>('idle');
  const rel = sec.audio ? findAudio(media, sec.audio) : null;
  if (!rel) return <SectionAudio sec={sec} examMode locked={false} />;
  return (
    <div className="vs-tts">
      <audio ref={ref} src={mediaUrl(rel)} onEnded={() => setSt('ended')}>
        <track kind="captions" />
      </audio>
      <Button
        size="sm"
        variant="primary"
        icon={st === 'playing' ? <Pause /> : <Play />}
        disabled={st !== 'idle'}
        onClick={() => {
          void ref.current?.play();
          setSt('playing');
        }}
      >
        {st === 'idle' ? 'Nghe đoạn này (1 lần)' : st === 'playing' ? 'Đang phát…' : 'Đã nghe xong'}
      </Button>
    </div>
  );
}

export function QuizView() {
  const { setId = '' } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const s = useVstep((x) => x.state)!;
  const set: VstepSet | undefined = useMemo(() => allSets(s).find((x) => x.id === setId), [s.sets, setId]); // eslint-disable-line react-hooks/exhaustive-deps
  const reviewAttempt = s.attempts.find((a) => a.id === sp.get('review'));
  const [phase, setPhase] = useState<'ready' | 'doing' | 'done'>(reviewAttempt ? 'done' : 'ready');
  const [examMode, setExamMode] = useState(true);
  const [answers, setAnswers] = useState<number[]>(() => reviewAttempt?.answers ?? []);
  const [secIdx, setSecIdx] = useState(0);
  const [elapsed, resetTimer] = useElapsed(phase === 'doing');
  const [result, setResult] = useState<VstepAttempt | null>(reviewAttempt ?? null);

  const flat = useMemo(
    () => (set ? set.sections.flatMap((sec, si) => sec.questions.map((q, qi) => ({ sec, si, q, qi }))) : []),
    [set],
  );
  const offsets = useMemo(() => {
    const o: number[] = [];
    let n = 0;
    for (const sec of set?.sections ?? []) {
      o.push(n);
      n += sec.questions.length;
    }
    return o;
  }, [set]);

  const isListening = !!set && (set.skill === 'listening' || set.sections.some((x) => x.audio || x.tts));
  const minutes = set?.minutes ?? (isListening ? VSTEP_MINUTES.listening : VSTEP_MINUTES.reading);
  const remain = minutes * 60 - elapsed;

  const submit = async (force = false) => {
    if (!set) return;
    const blank = flat.filter((_, i) => answers[i] == null || answers[i] < 0).length;
    if (!force && blank > 0) {
      const ok = await confirmDialog({
        title: 'Nộp bài?',
        text: `Còn ${blank} câu chưa chọn. Thi thật không bị trừ điểm câu sai - nên chọn hết trước khi nộp.`,
        confirmLabel: 'Vẫn nộp',
      });
      if (!ok) return;
    }
    stopSpeaking();
    const correct = flat.filter((f, i) => answers[i] === f.q.answer).length;
    const att: VstepAttempt = {
      id: uid(),
      setId: set.id,
      setTitle: set.title,
      skill: isListening ? 'listening' : 'reading',
      at: Date.now(),
      correct,
      total: flat.length,
      durationSec: Math.round(elapsed),
      answers: flat.map((_, i) => answers[i] ?? -1),
    };
    useVstep.getState().update((st) => {
      st.attempts.push(att);
      completeLink(st, `set:${set.id}`);
    });
    setResult(att);
    setPhase('done');
  };

  useEffect(() => {
    if (phase === 'doing' && remain <= 0) void submit(true);
  }, [phase, remain <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!set) return <EmptyState title="Không tìm thấy bộ đề" text="Bộ đề có thể đã bị xoá khỏi kho." />;
  if (!set.sections.length)
    return (
      <EmptyState title={set.title} text="Bộ đề này chỉ có đề Viết/Nói - mở ở mục Luyện viết/Luyện nói.">
        <Button
          onClick={() => nav(set.writing.length ? '/vstep/writing?tab=practice' : '/vstep/speaking?tab=practice')}
        >
          Mở
        </Button>
      </EmptyState>
    );

  const sec = set.sections[secIdx];
  const review = phase === 'done';

  if (phase === 'ready')
    return (
      <div className="vs-page vs-narrow">
        <button className="vs-back" onClick={() => nav(-1)}>
          <ArrowLeft size={15} /> Quay lại
        </button>
        <Panel title={set.title}>
          {set.description && <p>{set.description}</p>}
          <ul className="vs-ul">
            <li>
              {set.sections.length} phần, {questionCount(set)} câu, thời gian {minutes} phút (hết giờ tự nộp).
            </li>
            {isListening && (
              <li>Đề Nghe: đọc câu hỏi trước, bấm nghe từng đoạn. Chế độ thi chỉ cho nghe 1 lần, không tua.</li>
            )}
            <li>Không trừ điểm câu sai. Sau khi nộp sẽ có đáp án, giải thích và lời thoại.</li>
          </ul>
          {isListening && (
            <div className="my-3 flex items-center gap-2">
              <span className="text-muted">Chế độ</span>
              <Segmented<'exam' | 'learn'>
                value={examMode ? 'exam' : 'learn'}
                onChange={(v) => setExamMode(v === 'exam')}
                options={[
                  { value: 'exam', label: 'Thi thật (nghe 1 lần)' },
                  { value: 'learn', label: 'Luyện (nghe lại thoải mái)' },
                ]}
              />
            </div>
          )}
          <Button
            variant="primary"
            size="lg"
            icon={<Play />}
            onClick={() => (setAnswers([]), resetTimer(), setSecIdx(0), setPhase('doing'))}
          >
            Bắt đầu làm bài
          </Button>
        </Panel>
      </div>
    );

  const score = result ? bandFromRaw(result.correct, result.total) : 0;

  return (
    <div className="vs-quiz">
      <div className="vs-quiz-bar">
        <button className="vs-back" onClick={() => nav(-1)}>
          <ArrowLeft size={15} />
        </button>
        <b className="truncate">{set.title}</b>
        <div className="vs-qnav">
          {flat.map((f, i) => (
            <button
              key={i}
              className={cn(
                'vs-qn',
                answers[i] != null && answers[i] >= 0 && 'ans',
                review && (answers[i] === f.q.answer ? 'ok' : 'bad'),
                f.si === secIdx && 'cur',
              )}
              onClick={() => {
                setSecIdx(f.si);
                setTimeout(
                  () => document.getElementById(`q-${i}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
                  30,
                );
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {review ? (
          <>
            <span className="vs-quiz-score">
              {result?.correct}/{result?.total} câu, điểm {score.toFixed(1)} ({levelOf(score)})
            </span>
            <Button
              size="sm"
              variant="outline"
              icon={<RotateCcw />}
              onClick={() => (
                setResult(null),
                setPhase('ready'),
                nav(`/vstep/quiz/${encodeURIComponent(set.id)}`, { replace: true })
              )}
            >
              Làm lại
            </Button>
          </>
        ) : (
          <>
            <span className={cn('vs-timer', remain < 300 && 'warn')}>{mmss(remain)}</span>
            <Button size="sm" variant="primary" icon={<Send />} onClick={() => void submit()}>
              Nộp bài
            </Button>
          </>
        )}
      </div>
      <div className="vs-sec-tabs">
        {set.sections.map((x, i) => (
          <button key={i} className={cn('vs-sec-tab', i === secIdx && 'on')} onClick={() => setSecIdx(i)}>
            {x.title}
          </button>
        ))}
      </div>
      <div className={cn('vs-quiz-body', sec.passage && 'two')}>
        {sec.passage && (
          <div className="vs-passage">
            <Rich src={sec.passage} />
          </div>
        )}
        <div className="vs-questions">
          {sec.instructions && <p className="vs-instr">{sec.instructions}</p>}
          {(sec.audio || sec.tts) &&
            (examMode && !review && sec.audio ? (
              <ExamAudio key={secIdx} sec={sec} />
            ) : (
              <SectionAudio key={secIdx} sec={sec} examMode={examMode && !review} locked={review} />
            ))}
          {sec.questions.map((q, qi) => {
            const i = offsets[secIdx] + qi;
            return (
              <div key={qi} id={`q-${i}`} className="vs-q">
                <div className="vs-q-prompt">
                  <b>{i + 1}.</b>{' '}
                  <span dangerouslySetInnerHTML={{ __html: mdHtml(q.prompt).replace(/^<p>|<\/p>\s*$/g, '') }} />
                </div>
                <div className="vs-opts">
                  {q.options.map((o, oi) => (
                    <button
                      key={oi}
                      disabled={review}
                      className={cn(
                        'vs-opt',
                        answers[i] === oi && 'sel',
                        review && oi === q.answer && 'ok',
                        review && answers[i] === oi && oi !== q.answer && 'bad',
                      )}
                      onClick={() => setAnswers((a) => Object.assign([...a], { [i]: oi }))}
                    >
                      <span className="vs-opt-l">{LETTERS[oi]}</span>
                      <span>{o}</span>
                    </button>
                  ))}
                </div>
                {review && q.explain && <div className="vs-explain">{q.explain}</div>}
              </div>
            );
          })}
          {review && (sec.script || sec.tts) && (
            <Panel title="Lời thoại">
              <Rich src={'~~~dialog\n' + (sec.script ?? sec.tts ?? '') + '\n~~~'} />
            </Panel>
          )}
          <div className="vs-doc-foot">
            <Button variant="outline" disabled={secIdx === 0} onClick={() => setSecIdx(secIdx - 1)}>
              Phần trước
            </Button>
            {secIdx < set.sections.length - 1 ? (
              <Button variant="primary" onClick={() => setSecIdx(secIdx + 1)}>
                Phần tiếp theo
              </Button>
            ) : (
              !review && (
                <Button variant="primary" icon={<Send />} onClick={() => void submit()}>
                  Nộp bài
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
