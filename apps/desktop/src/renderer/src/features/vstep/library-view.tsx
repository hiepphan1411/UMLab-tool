import { FileDown, FileUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VstepImportError, parseVstepSets, questionCount, type VstepSetInput } from '@umlab/core';
import { umlab } from '@/lib/api';
import { Button, toast } from '@/ui';
import { Panel } from './common';
import { Rich } from './rich';
import { SetList, allSets } from './skill-view';
import { useVstep } from './store';

const SAMPLE: VstepSetInput = {
  kind: 'vstep-set',
  version: 1,
  id: 'de-cua-toi-1',
  title: 'Đề luyện của tôi số 1',
  description: 'Mô tả ngắn (tuỳ chọn)',
  skill: 'mixed',
  level: 'B1',
  minutes: 60,
  sections: [
    {
      title: 'Listening Part 1 – Câu 1',
      part: 1,
      audio: '01-VSTEP-BAC-3-B1.mp3',
      script: 'Woman 1: Are you going up?\nWoman 2: Yes. Which floor do you want?',
      questions: [
        {
          prompt: 'Where does this conversation take place?',
          options: ['In an airplane', 'In an elevator', 'In a flower shop', "In a doctor's office"],
          answer: 'B',
          explain: '"going up", "which floor" → thang máy.',
        },
      ],
    },
    {
      title: 'Listening (giọng máy đọc)',
      part: 1,
      tts: 'Man: Is the library open on Sunday?\nWoman: Yes, but only in the morning.',
      questions: [
        {
          prompt: 'When is the library open on Sunday?',
          options: ['All day', 'In the morning', 'In the afternoon', 'It is closed'],
          answer: 1,
        },
      ],
    },
    {
      title: 'Reading Passage 1',
      part: 1,
      passage: 'Đoạn văn (Markdown). **In đậm**, xuống dòng hai lần để tách đoạn.',
      questions: [{ prompt: 'What is the passage mainly about?', options: ['A', 'B', 'C', 'D'], answer: 0 }],
    },
  ],
  writing: [
    {
      id: 'my-w1',
      task: 1,
      kind: 'informal',
      title: 'Thư cho bạn',
      prompt: 'Write an email to…\n- ý 1\n- ý 2\n- ý 3',
      minWords: 120,
      minutes: 20,
    },
  ],
  speaking: [
    { id: 'my-p1', part: 1, topic: 'Hobbies', questions: ['Do you have any hobbies?', 'Why do you enjoy them?'] },
    {
      id: 'my-p2',
      part: 2,
      topic: 'Chọn quà',
      prompt: 'Your friend… Which option is the best?',
      options: ['A', 'B', 'C'],
    },
    {
      id: 'my-p3',
      part: 3,
      topic: 'Reading books is important',
      ideas: ['Knowledge', 'Critical thinking', 'Entertainment'],
      followUps: ['Do you read e-books?'],
    },
  ],
};

const GUIDE = `~~~note Định dạng tệp JSON
- Một tệp có thể chứa **một bộ đề**, **mảng nhiều bộ đề**, hoặc \`{ "sets": [...] }\`. Tối đa 10 MB.
- \`id\` là duy nhất; nhập lại cùng \`id\` sẽ **thay** bộ đề cũ.
- \`sections\`: phần trắc nghiệm Nghe/Đọc. Mỗi câu có \`prompt\`, \`options\` (2–6 lựa chọn), \`answer\` (chữ "A"–"F" hoặc số 0–5), \`explain\` (giải thích, tuỳ chọn).
- Nghe: \`audio\` là tên tệp MP3 trong thư mục tài liệu (vd "05-VSTEP-BAC-3-B1.mp3") hoặc URL https; hoặc \`tts\` để máy đọc lời thoại ("Man:", "Woman:" đổi giọng); \`script\` hiện sau khi nộp.
- Đọc: \`passage\` là bài đọc dạng Markdown.
- \`writing\`: đề Viết (\`task\` 1 hoặc 2, \`kind\`: informal, semi-formal, formal, opinion, adv-dis, problem-solution, discussion, cause-effect), có thể kèm \`outline\`, \`sample\`.
- \`speaking\`: đề Nói (\`part\` 1–3, \`questions\` / \`options\` / \`ideas\` / \`followUps\`, \`sample\`).
- Bấm **Tải tệp mẫu** để có tệp đầy đủ các trường.
~~~`;

export function LibraryView() {
  const nav = useNavigate();
  const s = useVstep((x) => x.state)!;
  const sets = allSets(s);

  const doImport = async () => {
    const files = await umlab.files.open({
      filters: [{ name: 'Bộ đề JSON', extensions: ['json'] }],
      multiple: true,
      asText: true,
    });
    let n = 0;
    for (const f of files) {
      try {
        const list = parseVstepSets(f.text ?? '');
        useVstep.getState().update((st) => {
          for (const x of list) {
            if (x.id.startsWith('builtin-')) x.id = 'u-' + x.id;
            st.sets = [...st.sets.filter((y) => (y as { id?: string }).id !== x.id), x];
          }
        });
        n += list.length;
      } catch (e) {
        toast(`${f.name}: ${e instanceof VstepImportError ? e.message : String(e)}`, { error: true });
      }
    }
    if (n) toast(`Đã nhập ${n} bộ đề`);
  };

  const sample = async () => {
    const path = await umlab.files.save({
      defaultName: 'mau-bo-de-vstep.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      data: JSON.stringify(SAMPLE, null, 2),
    });
    if (path) toast('Đã lưu tệp mẫu');
  };

  return (
    <div className="vs-page">
      <div className="vs-page-head">
        <h1>Kho đề</h1>
        <span className="text-muted">{sets.length} bộ đề</span>
        <span className="flex-1" />
        <Button variant="outline" icon={<FileDown />} onClick={() => void sample()}>
          Tải tệp mẫu
        </Button>
        <Button variant="primary" icon={<FileUp />} onClick={() => void doImport()}>
          Nhập đề từ JSON
        </Button>
      </div>
      <Panel title="Đề Nghe">
        <SetList skill="listening" />
      </Panel>
      <Panel title="Đề Đọc">
        <SetList skill="reading" />
      </Panel>
      <Panel title="Đề Viết và Nói">
        <div className="vs-list">
          {sets
            .filter((x) => x.writing.length || x.speaking.length)
            .map((x) => (
              <div key={x.id} className="vs-row">
                <div className="vs-row-main">
                  <div className="vs-row-title">{x.title}</div>
                  <div className="vs-row-sub">
                    {x.writing.length ? `${x.writing.length} đề Viết` : ''}
                    {x.writing.length && x.speaking.length ? ', ' : ''}
                    {x.speaking.length ? `${x.speaking.length} đề Nói` : ''}
                    {questionCount(x) ? `, ${questionCount(x)} câu trắc nghiệm` : ''}
                  </div>
                </div>
                {x.writing.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => nav(`/vstep/writing?tab=practice&task=${encodeURIComponent(x.writing[0].id)}`)}
                  >
                    Luyện viết
                  </Button>
                )}
                {x.speaking.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => nav(`/vstep/speaking?tab=practice&task=${encodeURIComponent(x.speaking[0].id)}`)}
                  >
                    Luyện nói
                  </Button>
                )}
              </div>
            ))}
        </div>
      </Panel>
      <Rich src={GUIDE} />
    </div>
  );
}
