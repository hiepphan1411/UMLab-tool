import { Download, Mic, Square, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { VstepSpeaking } from '@umlab/core';
import { umlab } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button, Segmented, toast } from '@/ui';
import { Panel, completeLink, mmss } from './common';
import { DOCS } from './content';
import { Rich } from './rich';
import { allSets } from './skill-view';
import { speak, stopSpeaking } from './speech';
import { SidePane } from './layout';
import { uid, useVstep } from './store';

const templateFor = (part: number) => {
  const secs = DOCS.speaking.parts.flatMap((p) => p.sections);
  const id = part === 1 ? 's2-type1' : part === 2 ? 's3-template' : 's4-template';
  return secs.find((s) => s.id === id)?.body ?? '';
};

const PART1_CHEAT = `~~~template 8 dạng Part 1 (nói 3 câu: Trả lời → Lý do → Ví dụ)
1 Sở thích:   Personally, I really enjoy [V-ing] because it helps me [V]. Besides, I find it a great way to [V].
2 So sánh:    I prefer [A] to [B] because [A] is more [adj]. Also, [A] allows me to [V].
3 Ý kiến:     Yes, I think [X] is important because it helps people [V]. It can also [V].
4 Tần suất:   I usually [V] [twice a week]. I started doing it [a few years] ago, and I enjoy it because [lý do].
5 Yêu thích:  My favourite [thing] is [X]. I particularly like it because [lý do]. For example, [chi tiết].
6 Mô tả:      [X] is [vị trí]. It is quite [adj] and [adj]. What I like most about it is [điểm nổi bật].
7 Tương lai:  In the future, I'm planning to [V]. I'd like to do this because [lý do].
8 Câu lạ:     Well, to be honest, I've never really thought about it, but I think [ý đơn giản].
~~~`;

type Stage = 'idle' | 'prep' | 'speak' | 'done';

function useRecorder() {
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
      };
      r.start();
      rec.current = r;
      setOn(true);
      return true;
    } catch {
      toast('Không mở được micro. Kiểm tra Cài đặt Windows → Quyền riêng tư → Micro.', { error: true });
      return false;
    }
  };
  const stop = () => {
    if (rec.current?.state === 'recording') rec.current.stop();
    setOn(false);
  };
  return { start, stop, url, blob, on, clear: () => (setUrl(null), setBlob(null)) };
}

function Practice({ task }: { task: VstepSpeaking }) {
  const [stage, setStage] = useState<Stage>('idle');
  const [left, setLeft] = useState(0);
  const [qi, setQi] = useState(0);
  const [self, setSelf] = useState<number>(-1);
  const startedAt = useRef(0);
  const r = useRecorder();
  const prep = task.prepSec ?? (task.part === 1 ? 0 : 60);
  const talk = task.speakSec ?? (task.part === 1 ? 180 : task.part === 2 ? 180 : 240);
  const questions = task.questions ?? [];

  useEffect(() => {
    if (stage !== 'prep' && stage !== 'speak') return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => {
    if (left > 0) return;
    if (stage === 'prep') void beginSpeak();
    else if (stage === 'speak') finish();
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => (stopSpeaking(), r.stop()), []); // eslint-disable-line react-hooks/exhaustive-deps

  const readPrompt = async () => {
    if (task.part === 1) return speak(questions[0] ?? task.topic, { gender: 'female' });
    if (task.part === 2)
      return speak((task.prompt ?? task.topic) + ' Which option do you think is the best? Why?', { gender: 'female' });
    return speak(`Please talk about the following topic: ${task.topic}.`, { gender: 'female' });
  };

  const beginSpeak = async () => {
    if (!(await r.start())) return setStage('idle');
    startedAt.current = Date.now();
    setStage('speak');
    setLeft(talk);
  };

  const start = async () => {
    r.clear();
    setQi(0);
    setStage('prep');
    setLeft(9999);
    await readPrompt();
    if (prep > 0) setLeft(prep);
    else void beginSpeak();
  };

  const finish = () => {
    r.stop();
    stopSpeaking();
    setStage('done');
  };

  const nextQ = () => {
    const n = qi + 1;
    if (n >= questions.length) return finish();
    setQi(n);
    stopSpeaking();
    void speak(questions[n], { gender: 'female' });
  };

  const saveLog = () => {
    const dur = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
    useVstep.getState().update((s) => {
      s.speaking.push({
        id: uid(),
        taskId: task.id,
        part: task.part,
        topic: task.topic,
        at: Date.now(),
        durationSec: Math.round(Math.min(dur, talk + 5)),
        self: self >= 0 ? self : null,
      });
      completeLink(s, `speak:${task.id}`);
    });
    toast('Đã lưu lần luyện');
  };

  const download = async () => {
    if (!r.blob) return;
    const bytes = new Uint8Array(await r.blob.arrayBuffer());
    const path = await umlab.files.save({
      defaultName: `noi-part${task.part}-${task.id}.webm`,
      filters: [{ name: 'Âm thanh', extensions: ['webm'] }],
      data: bytes,
    });
    if (path) toast('Đã lưu bản ghi');
  };

  return (
    <div className="vs-speak">
      <Panel title={`Part ${task.part}: ${task.topic}`}>
        {task.prompt && <Rich src={task.prompt} className="vs-prompt" />}
        {task.part === 1 && (
          <ol className="vs-qlist">
            {questions.map((q, i) => (
              <li key={i} className={cn(stage === 'speak' && i === qi && 'on')}>
                <button
                  className="vt-say"
                  onClick={() => (stopSpeaking(), void speak(q))}
                  aria-label="Nghe câu hỏi"
                  title="Nghe câu hỏi"
                >
                  <Volume2 size={13} />
                </button>
                {q}
              </li>
            ))}
          </ol>
        )}
        {task.options && (
          <div className="vs-mind">
            {task.options.map((o, i) => (
              <span key={i} className="vs-mind-n">
                {String.fromCharCode(65 + i)}. {o}
              </span>
            ))}
          </div>
        )}
        {task.ideas && (
          <div className="vs-mind">
            <span className="vs-mind-c">{task.topic}</span>
            {task.ideas.map((o, i) => (
              <span key={i} className="vs-mind-n">
                {o}
              </span>
            ))}
          </div>
        )}
        <div className="vs-speak-ctl">
          {stage === 'idle' || stage === 'done' ? (
            <Button variant="primary" size="lg" icon={<Mic />} onClick={() => void start()}>
              {stage === 'done' ? 'Luyện lại' : 'Bắt đầu (máy đọc đề → chuẩn bị → ghi âm)'}
            </Button>
          ) : (
            <>
              <span className={cn('vs-big-timer', stage === 'speak' && 'rec')}>
                {stage === 'prep' ? (left > 999 ? 'Nghe đề…' : `Chuẩn bị ${mmss(left)}`) : `Đang ghi âm ${mmss(left)}`}
              </span>
              {stage === 'prep' && left <= 999 && <Button onClick={() => void beginSpeak()}>Nói luôn</Button>}
              {stage === 'speak' && task.part === 1 && (
                <Button onClick={nextQ}>
                  {qi + 1 < questions.length ? `Câu tiếp (${qi + 2}/${questions.length})` : 'Kết thúc'}
                </Button>
              )}
              <Button variant="outline" icon={<Square />} onClick={finish}>
                Dừng
              </Button>
            </>
          )}
        </div>
        {r.url && (
          <div className="vs-recorded">
            <audio src={r.url} controls>
              <track kind="captions" />
            </audio>
            <Button size="sm" variant="outline" icon={<Download />} onClick={() => void download()}>
              Lưu bản ghi
            </Button>
          </div>
        )}
        {stage === 'done' && (
          <div className="vs-selfscore">
            <span>Nghe lại và tự chấm (trôi chảy, đúng ý, phát âm, từ vựng, ngữ pháp):</span>
            <Segmented<number>
              value={self}
              onChange={setSelf}
              options={[3, 4, 5, 6, 7, 8].map((v) => ({ value: v, label: String(v) }))}
            />
            <Button size="sm" variant="primary" onClick={saveLog}>
              Lưu
            </Button>
          </div>
        )}
        {task.followUps && stage === 'done' && (
          <>
            <h4 className="vs-h4">Câu hỏi mở rộng (luyện thêm)</h4>
            <Rich src={'~~~say\n' + task.followUps.join('\n') + '\n~~~'} />
          </>
        )}
      </Panel>
      {task.sample && (
        <Panel title="Bài mẫu">
          <Rich src={'~~~sample Bài mẫu\n' + task.sample + '\n~~~'} />
        </Panel>
      )}
      <Panel title="Template dùng cho phần này">
        <Rich src={task.part === 1 ? PART1_CHEAT : templateFor(task.part)} />
      </Panel>
    </div>
  );
}

export function SpeakingLab() {
  const [sp, setSp] = useSearchParams();
  const s = useVstep((x) => x.state)!;
  const tasks = useMemo(() => allSets(s).flatMap((x) => x.speaking), [s.sets]); // eslint-disable-line react-hooks/exhaustive-deps
  const [part, setPart] = useState<0 | 1 | 2 | 3>(0);
  const cur = tasks.find((t) => t.id === sp.get('task')) ?? null;
  const done = new Set(s.speaking.map((x) => x.taskId));
  return (
    <div className="vs-lab">
      <SidePane id="speaking" title="Đề nói" className="vs-lab-list">
        <Segmented<0 | 1 | 2 | 3>
          value={part}
          onChange={setPart}
          options={[
            { value: 0, label: 'Tất cả' },
            { value: 1, label: 'P1' },
            { value: 2, label: 'P2' },
            { value: 3, label: 'P3' },
          ]}
        />
        {tasks
          .filter((t) => !part || t.part === part)
          .map((t) => (
            <button
              key={t.id}
              className={cn('vs-lab-item', cur?.id === t.id && 'on')}
              onClick={() => setSp({ tab: 'practice', task: t.id }, { replace: true })}
            >
              <span className="vs-lab-tag">P{t.part}</span>
              <span className="vs-lab-t">{t.topic}</span>
              {done.has(t.id) && <span className="vs-lab-done">đã luyện</span>}
            </button>
          ))}
      </SidePane>
      <div className="vs-lab-main">
        {cur ? (
          <Practice key={cur.id} task={cur} />
        ) : (
          <div className="vs-page">
            <Panel title="Luyện nói như thi trên máy">
              <ol className="vs-ul">
                <li>Chọn một đề bên trái. Máy đọc đề bằng giọng tiếng Anh (như giám khảo trên máy).</li>
                <li>Part 2, 3 có 1 phút chuẩn bị - ghi từ khoá, không viết cả câu.</li>
                <li>Hết giờ chuẩn bị máy tự ghi âm. Part 1 bấm "Câu tiếp" để nghe câu hỏi sau.</li>
                <li>Nghe lại bản ghi, so với template và bài mẫu, tự chấm rồi lưu.</li>
              </ol>
            </Panel>
            <Panel title="Template Part 1">
              <Rich src={PART1_CHEAT} />
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
