import { FileText, Lightbulb, Pause, Play, RotateCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WRITING_KIND_LABEL, type VstepWriting } from '@umlab/core';
import { cn } from '@/lib/cn';
import { Button, Segmented, openMenuAt, toast } from '@/ui';
import { Panel, completeLink, fmtDate, mmss, useElapsed } from './common';
import { MY_FORMAL, MY_INFORMAL } from './content/writing-task1-extra';
import { Rich } from './rich';
import { allSets } from './skill-view';
import { SidePane } from './layout';
import { uid, useVstep } from './store';

const TEMPLATES: Record<string, string> = {
  informal: MY_INFORMAL,
  formal: MY_FORMAL,
  essay: `It is often said that [paraphrase the topic]. This issue has become a hot topic in recent years. In this essay, I will discuss [both sides / the advantages and disadvantages / the causes and solutions] and give my own opinion.

To begin with, [main idea 1]. This is because [explanation]. For example, [specific example]. As a result, [result]. In addition, [extra idea 1].

On the other hand, [main idea 2]. This means that [explanation]. For instance, [example]. Therefore, [result]. Moreover, [extra idea 2].

In conclusion, [summary of the two main ideas]. From my point of view, [your opinion]. I hope that [general wish / suggestion].`,
};

const CRITERIA = ['Hoàn thành yêu cầu (đủ ý, đủ từ, đúng giọng)', 'Tổ chức bài (đoạn, từ nối)', 'Từ vựng', 'Ngữ pháp'];

const countWords = (t: string) =>
  t.trim()
    ? t
        .trim()
        .split(/\s+/)
        .filter((w) => /[A-Za-z0-9]/.test(w)).length
    : 0;
const draftKey = (id: string) => `umlab.vstep.draft.${id}`;

function Editor({ task }: { task: VstepWriting }) {
  const allWritings = useVstep((s) => s.state!.writings);
  const writings = useMemo(() => allWritings.filter((w) => w.taskId === task.id), [allWritings, task.id]);
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(draftKey(task.id)) ?? '';
    } catch {
      return '';
    }
  });
  const [running, setRunning] = useState(false);
  const [elapsed, reset] = useElapsed(running);
  const [showOutline, setShowOutline] = useState(false);
  const [scores, setScores] = useState<(number | null)[]>([null, null, null, null]);
  const words = countWords(text);
  const limit = (task.minutes ?? (task.task === 1 ? 20 : 40)) * 60;
  const remain = limit - elapsed;

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(task.id), text);
    } catch {}
  }, [text, task.id]);

  const insert = (key: string) => setText((t) => (t.trim() ? t + '\n\n' : '') + TEMPLATES[key]);
  const filled = scores.filter((x): x is number => x != null);
  const self = filled.length === 4 ? Math.round((filled.reduce((a, b) => a + b, 0) / 4) * 2) / 2 : null;

  const save = () => {
    if (!words) return toast('Bài viết đang trống', { error: true });
    useVstep.getState().update((s) => {
      s.writings.push({
        id: uid(),
        taskId: task.id,
        title: task.title ?? task.prompt.slice(0, 60),
        task: task.task,
        text,
        words,
        at: Date.now(),
        durationSec: Math.round(elapsed),
        self,
      });
      completeLink(s, `write:${task.id}`);
    });
    setRunning(false);
    toast(
      self == null
        ? 'Đã lưu bài viết. Hãy tự chấm 4 tiêu chí để có điểm ước tính.'
        : `Đã lưu bài viết, tự chấm ${self.toFixed(1)}`,
    );
  };

  return (
    <div className="vs-write">
      <Panel
        title={`Task ${task.task}: ${task.title ?? ''}`}
        actions={<span className="vs-pill">{WRITING_KIND_LABEL[task.kind]}</span>}
      >
        <Rich src={task.prompt.replace(/\n- /g, '\n\n- ')} className="vs-prompt" />
        <div className="flex flex-wrap gap-1.5">
          {task.outline && (
            <Button size="sm" variant="outline" icon={<Lightbulb />} onClick={() => setShowOutline((v) => !v)}>
              {showOutline ? 'Ẩn dàn ý' : 'Gợi ý dàn ý'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            icon={<FileText />}
            onClick={(e) =>
              openMenuAt(e.currentTarget, [
                { label: 'Template thư thân mật', onSelect: () => insert('informal') },
                { label: 'Template thư trang trọng', onSelect: () => insert('formal') },
                { label: 'Template bài luận 4 đoạn', onSelect: () => insert('essay') },
              ])
            }
          >
            Chèn template
          </Button>
        </div>
        {showOutline && task.outline && <pre className="vs-outline">{task.outline}</pre>}
        {task.sample && <Rich src={'~~~sample Bài mẫu\n' + task.sample + '\n~~~'} />}
      </Panel>

      <div className="vs-editor-bar">
        <button
          className={cn('vs-timer', remain < 120 && 'warn')}
          onClick={() => setRunning((r) => !r)}
          title="Bấm để bắt đầu/tạm dừng"
        >
          {running ? <Pause size={13} /> : <Play size={13} />} {remain >= 0 ? mmss(remain) : `+${mmss(-remain)}`}
        </button>
        <button
          className="ibtn"
          title="Đặt lại đồng hồ"
          aria-label="Đặt lại đồng hồ"
          onClick={() => (reset(), setRunning(false))}
        >
          <RotateCcw size={14} />
        </button>
        <span className={cn('vs-words', words >= task.minWords ? 'text-ok' : 'text-warn')}>
          {words}/{task.minWords} từ
        </span>
        <span className="flex-1" />
        <Button size="sm" variant="primary" icon={<Save />} onClick={save}>
          Lưu bài
        </Button>
      </div>
      <textarea
        className="field vs-editor"
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (!running && e.target.value.length > text.length && elapsed === 0) setRunning(true);
        }}
        placeholder="Viết bài ở đây. Đồng hồ tự chạy khi bạn bắt đầu gõ."
      />

      <Panel title="Tự chấm theo 4 tiêu chí (so với bài mẫu và bảng kiểm tra)">
        <div className="vs-criteria">
          {CRITERIA.map((c, i) => (
            <div key={c} className="vs-crit">
              <span>{c}</span>
              <Segmented<number>
                value={scores[i] ?? -1}
                onChange={(v) => setScores((s) => Object.assign([...s], { [i]: v }))}
                options={[3, 4, 5, 6, 7, 8].map((v) => ({ value: v, label: String(v) }))}
              />
            </div>
          ))}
        </div>
        <p className="vs-muted-line">
          Gợi ý: 4 = đủ ý nhưng nhiều lỗi; 5 = đủ ý, bố cục rõ theo template, lỗi nhỏ; 6 = có câu phức đúng, từ vựng đa
          dạng. Điểm tự chấm: <b>{self == null ? '-' : self.toFixed(1)}</b>
        </p>
      </Panel>

      {writings.length > 0 && (
        <Panel title="Các lần đã viết đề này">
          {writings
            .slice()
            .reverse()
            .map((w) => (
              <details key={w.id} className="vs-hist">
                <summary>
                  {fmtDate(new Date(w.at).toISOString().slice(0, 10))}, {w.words} từ, {mmss(w.durationSec)}
                  {w.self != null ? `, tự chấm ${w.self.toFixed(1)}` : ''}
                </summary>
                <pre>{w.text}</pre>
                <Button size="sm" variant="outline" onClick={() => setText(w.text)}>
                  Mở lại để sửa
                </Button>
              </details>
            ))}
        </Panel>
      )}
    </div>
  );
}

export function WritingLab() {
  const [sp, setSp] = useSearchParams();
  const s = useVstep((x) => x.state)!;
  const tasks = useMemo(() => allSets(s).flatMap((x) => x.writing), [s.sets]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filter, setFilter] = useState<0 | 1 | 2>(0);
  const cur = tasks.find((t) => t.id === sp.get('task')) ?? null;
  const shown = tasks.filter((t) => !filter || t.task === filter);
  const doneIds = new Set(s.writings.map((w) => w.taskId));
  return (
    <div className="vs-lab">
      <SidePane id="writing" title="Đề viết" className="vs-lab-list">
        <Segmented<0 | 1 | 2>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 0, label: 'Tất cả' },
            { value: 1, label: 'Task 1' },
            { value: 2, label: 'Task 2' },
          ]}
        />
        {shown.map((t) => (
          <button
            key={t.id}
            className={cn('vs-lab-item', cur?.id === t.id && 'on')}
            onClick={() => setSp({ tab: 'practice', task: t.id }, { replace: true })}
          >
            <span className="vs-lab-tag">T{t.task}</span>
            <span className="vs-lab-t">{t.title ?? t.prompt.slice(0, 50)}</span>
            {doneIds.has(t.id) && <span className="vs-lab-done">đã viết</span>}
          </button>
        ))}
      </SidePane>
      <div className="vs-lab-main">
        {cur ? (
          <Editor key={cur.id} task={cur} />
        ) : (
          <div className="vs-page">
            <Panel title="Luyện viết theo template">
              <ol className="vs-ul">
                <li>Chọn một đề bên trái (Task 1 = thư 120 từ/20 phút, Task 2 = luận 250 từ/40 phút).</li>
                <li>Gạch các ý đề yêu cầu, xem "Gợi ý dàn ý" nếu bí ý.</li>
                <li>Bấm "Chèn template" rồi thay các [chỗ trống] bằng ý của bạn - đồng hồ tự chạy khi bắt đầu gõ.</li>
                <li>Soát lỗi theo bảng kiểm tra trong Tài liệu Viết (mục 3.6), tự chấm 4 tiêu chí rồi lưu.</li>
              </ol>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
